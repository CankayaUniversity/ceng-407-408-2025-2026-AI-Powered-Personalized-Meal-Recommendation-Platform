package com.mealapp.app.controller;

import com.mealapp.app.model.dto.inventory.InventoryGroupRequest;
import com.mealapp.app.model.dto.inventory.InventoryGroupResponse;
import com.mealapp.app.model.dto.inventory.InventoryItemRequest;
import com.mealapp.app.model.dto.inventory.InventoryItemResponse;
import com.mealapp.app.model.mapper.inventory.InventoryMapper;
import com.mealapp.app.util.UnitConverter;
import com.mealapp.domain.common.exception.MealAppDomainException;
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
        Double grams = request.getGrams();
        if (grams == null) {
            Ingredient ingredient = ingredientRepository.findById(request.getIngredientId()).orElse(null);
            grams = UnitConverter.convertToGrams(request.getQuantity(), request.getUnit(), ingredient);
        }

        return inventoryMapper.toItemResponse(
                inventoryService.upsertInventoryItem(
                        requireAuthenticatedUserId(jwt),
                        groupId,
                        request.getIngredientId(),
                        grams,
                        request.getUnit() // Store the original unit instead of "g"
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
        Double grams = request.getGrams();
        if (grams == null) {
            Ingredient ingredient = ingredientRepository.findById(request.getIngredientId()).orElse(null);
            grams = UnitConverter.convertToGrams(request.getQuantity(), request.getUnit(), ingredient);
        }

        return inventoryMapper.toItemResponse(
                inventoryService.updateInventoryItem(
                        requireAuthenticatedUserId(jwt),
                        groupId,
                        itemId,
                        request.getIngredientId(),
                        grams,
                        request.getUnit() // Store the original unit instead of "g"
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

    private String requireAuthenticatedUserId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new MealAppDomainException("Kimliği doğrulanmış kullanıcı bilgisi bulunamadı.");
        }

        return jwt.getSubject();
    }
}
