package com.mealapp.app.controller;

import com.mealapp.app.model.dto.inventory.*;
import com.mealapp.app.model.mapper.inventory.InventoryMapper;
import com.mealapp.app.util.UnitConverter;
import com.mealapp.domain.common.exception.MealAppDomainException;
import com.mealapp.domain.consumption.service.ConsumptionService;
import com.mealapp.domain.inventory.service.InventoryInvitationService;
import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.repository.IngredientRepository;
import com.mealapp.domain.inventory.service.InventoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/inventory-groups")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;
    private final InventoryInvitationService invitationService;
    private final ConsumptionService consumptionService;
    private final InventoryMapper inventoryMapper;
    private final IngredientRepository ingredientRepository;

    @GetMapping
    @Transactional(readOnly = true)
    public List<InventoryGroupResponse> getGroups(@AuthenticationPrincipal Jwt jwt) {
        return inventoryMapper.toGroupResponses(inventoryService.getUserInventoryGroups(requireAuthenticatedUserId(jwt)));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public InventoryGroupResponse createGroup(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody InventoryGroupRequest request) {
        return inventoryMapper.toGroupResponse(
                inventoryService.createGroup(requireAuthenticatedUserId(jwt), request.getName(), request.getIcon())
        );
    }

    @PutMapping("/{groupId}")
    public InventoryGroupResponse updateGroup(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long groupId,
            @Valid @RequestBody InventoryGroupRequest request
    ) {
        return inventoryMapper.toGroupResponse(
                inventoryService.updateGroup(requireAuthenticatedUserId(jwt), groupId, request.getName(), request.getIcon())
        );
    }

    @DeleteMapping("/{groupId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteGroup(@AuthenticationPrincipal Jwt jwt, @PathVariable Long groupId) {
        inventoryService.deleteGroup(requireAuthenticatedUserId(jwt), groupId);
    }

    @PostMapping("/{groupId}/items")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public InventoryItemResponse createItem(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long groupId,
            @Valid @RequestBody InventoryItemRequest request
    ) {
        Ingredient ingredient = ingredientRepository.findById(request.getIngredientId())
                .orElseThrow(() -> new MealAppDomainException("Malzeme bulunamadı"));

        Double grams = request.getGrams();
        if (grams == null) {
            grams = UnitConverter.convertToGrams(request.getQuantity(), request.getUnit(), ingredient);
        }

        // Katı ise 'g', sıvı ise 'ml' birimine sabitle. 
        // ML için 'quantity' alanında hacim bilgisini (grams / density) saklayacağız.
        boolean isLiquid = ingredient.getPhysicalState() == Ingredient.PhysicalState.LIQUID;
        String standardUnit = isLiquid ? "ml" : "g";
        Double finalQuantity = isLiquid 
                ? grams / ingredient.getDensity() 
                : grams;

        return inventoryMapper.toItemResponse(
                inventoryService.upsertInventoryItem(
                        requireAuthenticatedUserId(jwt),
                        groupId,
                        request.getIngredientId(),
                        finalQuantity,
                        standardUnit,
                        InventoryService.UpdateMode.valueOf(request.getUpdateMode().name())
                )
        );
    }

    @PutMapping("/{groupId}/items/{itemId}")
    @Transactional
    public InventoryItemResponse updateItem(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long groupId,
            @PathVariable Long itemId,
            @Valid @RequestBody InventoryItemRequest request
    ) {
        Ingredient ingredient = ingredientRepository.findById(request.getIngredientId())
                .orElseThrow(() -> new MealAppDomainException("Malzeme bulunamadı"));

        Double grams = request.getGrams();
        if (grams == null) {
            grams = UnitConverter.convertToGrams(request.getQuantity(), request.getUnit(), ingredient);
        }

        // Katı ise 'g', sıvı ise 'ml' birimine sabitle.
        // ML için 'quantity' alanında hacim bilgisini (grams / density) saklayacağız.
        boolean isLiquid = ingredient.getPhysicalState() == Ingredient.PhysicalState.LIQUID;
        String standardUnit = isLiquid ? "ml" : "g";
        Double finalQuantity = isLiquid 
                ? grams / ingredient.getDensity() 
                : grams;

        return inventoryMapper.toItemResponse(
                inventoryService.updateInventoryItem(
                        requireAuthenticatedUserId(jwt),
                        groupId,
                        itemId,
                        request.getIngredientId(),
                        finalQuantity,
                        standardUnit,
                        InventoryService.UpdateMode.valueOf(request.getUpdateMode().name())
                )
        );
    }

    @DeleteMapping("/{groupId}/items/{itemId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteItem(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long groupId,
            @PathVariable Long itemId
    ) {
        inventoryService.deleteInventoryItem(requireAuthenticatedUserId(jwt), groupId, itemId);
    }

    @PostMapping("/{groupId}/invite")
    @ResponseStatus(HttpStatus.CREATED)
    public void inviteUser(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long groupId,
            @RequestParam String email
    ) {
        String inviterEmail = extractEmail(jwt);
        invitationService.inviteUser(requireAuthenticatedUserId(jwt), inviterEmail, groupId, email);
    }

    private String extractEmail(Jwt jwt) {
        if (jwt == null) {
            throw new MealAppDomainException("Kimliği doğrulanmış kullanıcı bilgisi bulunamadı.");
        }

        // Try all possible email claims (Keycloak standard is 'email')
        String email = jwt.getClaimAsString("email");

        if (email == null || email.isBlank()) {
            email = jwt.getClaimAsString("preferred_username");
        }

        // If still no email, check subject if it looks like an email
        if (email == null || email.isBlank() || !email.contains("@")) {
            String sub = jwt.getSubject();
            if (sub != null && sub.contains("@")) {
                email = sub;
            }
        }

        if (email == null || email.isBlank()) {
            throw new MealAppDomainException("Kullanıcı e-posta bilgisi JWT token içerisinde bulunamadı. " +
                    "Lütfen Keycloak profilinizde e-posta adresinizin tanımlı olduğundan emin olun.");
        }
        return email;
    }

    @DeleteMapping("/{groupId}/users/{userIdToRemove}")
    public InventoryGroupResponse removeUser(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long groupId,
            @PathVariable String userIdToRemove
    ) {
        return inventoryMapper.toGroupResponse(
                inventoryService.removeUserFromGroup(requireAuthenticatedUserId(jwt), groupId, userIdToRemove)
        );
    }

    @PostMapping("/{groupId}/items/{itemId}/consume")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void consumeItem(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long groupId,
            @PathVariable Long itemId,
            @Valid @RequestBody InventoryConsumeRequest request
    ) {
        // Güvenlik kontrolü: Kullanıcı bu gruba dahil mi?
        inventoryService.getRequiredGroup(requireAuthenticatedUserId(jwt), groupId);
        
        consumptionService.consume(itemId, request.getUserAmounts());
    }

    private String requireAuthenticatedUserId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new MealAppDomainException("Kimliği doğrulanmış kullanıcı bilgisi bulunamadı.");
        }

        return jwt.getSubject();
    }
}
