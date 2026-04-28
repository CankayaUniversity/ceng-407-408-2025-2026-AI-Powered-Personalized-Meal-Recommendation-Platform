package com.mealapp.app.controller;

import com.mealapp.app.model.dto.inventory.*;
import com.mealapp.app.model.mapper.inventory.InventoryMapper;
import com.mealapp.domain.common.exception.MealAppDomainException;
import com.mealapp.domain.consumption.service.ConsumptionService;
import com.mealapp.domain.inventory.entity.InventoryGroup;
import com.mealapp.domain.inventory.service.InventoryInvitationService;
import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.repository.IngredientRepository;
import com.mealapp.domain.inventory.service.InventoryService;
import com.mealapp.domain.recipe.service.UnitConverterService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import org.springframework.web.bind.annotation.RequestParam;

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
    private final UnitConverterService unitConverterService;

    @GetMapping
    @Transactional(readOnly = true)
    public List<InventoryGroupResponse> getGroups(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        String userId = requireAuthenticatedUserId(jwt);
        List<InventoryGroup> groups = inventoryService.getUserInventoryGroups(userId);
        List<com.mealapp.domain.inventory.entity.Inventory> lowStockItems = inventoryService.getLowAndMissingStockItems(userId, null);
        
        return inventoryMapper.toGroupResponses(groups, lowStockItems);
    }

    @GetMapping("/{groupId}/items")
    @Transactional(readOnly = true)
    public List<InventoryItemResponse> getItems(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long groupId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        org.springframework.data.domain.PageRequest pageRequest = org.springframework.data.domain.PageRequest.of(page, size);
        return inventoryMapper.toItemResponses(
                inventoryService.getInventoryItemsByGroup(requireAuthenticatedUserId(jwt), groupId, pageRequest).getContent()
        );
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public InventoryGroupResponse createGroup(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody InventoryGroupRequest request) {
        String userId = requireAuthenticatedUserId(jwt);
        return inventoryMapper.toGroupResponse(
                inventoryService.createGroup(userId, request.getName(), request.getIcon()),
                0 // New group has 0 low stock items
        );
    }

    @PutMapping("/{groupId}")
    public InventoryGroupResponse updateGroup(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long groupId,
            @Valid @RequestBody InventoryGroupRequest request
    ) {
        String userId = requireAuthenticatedUserId(jwt);
        InventoryGroup group = inventoryService.updateGroup(userId, groupId, request.getName(), request.getIcon());
        int lowStockCount = (int) inventoryService.getLowAndMissingStockItems(userId, List.of(groupId)).size();
        return inventoryMapper.toGroupResponse(group, lowStockCount);
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
            grams = unitConverterService.convertToGrams(request.getQuantity(), request.getUnit(), ingredient);
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
            grams = unitConverterService.convertToGrams(request.getQuantity(), request.getUnit(), ingredient);
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
        String userId = requireAuthenticatedUserId(jwt);
        InventoryGroup group = inventoryService.removeUserFromGroup(userId, groupId, userIdToRemove);
        int lowStockCount = (int) inventoryService.getLowAndMissingStockItems(userId, List.of(groupId)).size();
        return inventoryMapper.toGroupResponse(group, lowStockCount);
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

    @GetMapping("/shopping-list")
    public ShoppingListResponse getShoppingList(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) List<Long> groupIds
    ) {
        String userId = requireAuthenticatedUserId(jwt);
        
        // Boş listenin [null] içermesi durumunu temizle (Spring parametre bağlama bazen yapabilir)
        List<Long> cleanedGroupIds = groupIds;
        if (groupIds != null) {
            cleanedGroupIds = groupIds.stream().filter(java.util.Objects::nonNull).toList();
            if (cleanedGroupIds.isEmpty()) {
                cleanedGroupIds = null;
            }
        }

        List<com.mealapp.domain.inventory.entity.Inventory> lowStockItems = inventoryService.getLowAndMissingStockItems(userId, cleanedGroupIds);

        List<ShoppingListResponse.ShoppingItem> shoppingItems = lowStockItems.stream()
                .filter(item -> item != null && item.getIngredient() != null && item.getInventoryGroup() != null)
                .map(item -> ShoppingListResponse.ShoppingItem.builder()
                        .ingredientId(item.getIngredient().getId())
                        .ingredientName(item.getIngredient().getName() != null ? item.getIngredient().getName() : "Unknown Ingredient")
                        .currentQuantity(item.getQuantity() != null ? item.getQuantity() : 0.0)
                        .unit(item.getUnit() != null ? item.getUnit() : "")
                        .groupName(item.getInventoryGroup().getName() != null ? item.getInventoryGroup().getName() : "Unknown Group")
                        .status(item.getQuantity() != null && item.getQuantity() > 0 ? "LOW" : "MISSING")
                        .build())
                .toList();

        return ShoppingListResponse.builder()
                .items(shoppingItems)
                .build();
    }

    private String requireAuthenticatedUserId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new MealAppDomainException("Kimliği doğrulanmış kullanıcı bilgisi bulunamadı.");
        }

        return jwt.getSubject();
    }
}
