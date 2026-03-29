package com.mealapp.app.controller;

import com.mealapp.app.model.dto.consumption.ConsumptionRequest;
import com.mealapp.app.model.dto.consumption.ConsumptionResponse;
import com.mealapp.domain.consumption.entity.DailyConsumption;
import com.mealapp.domain.consumption.service.DailyConsumptionService;
import com.mealapp.domain.common.exception.MealAppDomainException;
import com.mealapp.domain.common.exception.ResourceNotFoundException;
import com.mealapp.domain.inventory.entity.InventoryGroup;
import com.mealapp.domain.inventory.service.InventoryService;
import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.service.IngredientService;
import com.mealapp.domain.recipe.service.RecipeService;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

/**
 * Günlük tüketim (yemek) kayıtlarını yöneten uç noktalar.
 * Not: Dışarıda yenen öğünlerde estimatedCalories alanı AI tarafından daha sonra doldurulacaktır.
 */
@RestController
@RequestMapping("/api/v1/consumptions")
@RequiredArgsConstructor
public class ConsumptionController {

    private final DailyConsumptionService dailyConsumptionService;
    private final UserService userService;
    private final RecipeService recipeService;
    private final IngredientService ingredientService;
    private final InventoryService inventoryService;

    /**
     * Günlük tüketim kaydı oluşturur.
     */
    @PostMapping
    public ConsumptionResponse log(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ConsumptionRequest request) {
        String userId = requireAuthenticatedUserId(jwt, request.getUserId());
        User user = userService.findById(userId)
                .orElseGet(() -> userService.save(User.builder().id(userId).build()));

        if (request.getRecipeId() != null && request.getIngredientId() != null) {
            throw new MealAppDomainException("Aynı kayıtta hem tarif hem de malzeme seçilemez.");
        }

        Recipe recipe = null;
        if (request.getRecipeId() != null) {
            recipe = recipeService.findById(request.getRecipeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Tarif bulunamadı ID: " + request.getRecipeId()));
        }

        Ingredient ingredient = null;
        if (request.getIngredientId() != null) {
            ingredient = ingredientService.findById(request.getIngredientId())
                    .orElseThrow(() -> new ResourceNotFoundException("Malzeme bulunamadı ID: " + request.getIngredientId()));
        }

        InventoryGroup inventoryGroup = null;
        if (request.getInventoryGroupId() != null) {
            inventoryGroup = inventoryService.getUserInventoryGroup(userId, request.getInventoryGroupId());
        }

        DailyConsumption entity = DailyConsumption.builder()
                .user(user)
                .foodName(resolveFoodName(request, recipe, ingredient))
                .recipe(recipe)
                .ingredient(ingredient)
                .mealType(request.getMealType())
                .portionSize(resolvePortionSize(request))
                .portionLabel(request.getPortionLabel())
                .portionMultiplier(request.getPortionMultiplier())
                .portionGrams(request.getPortionGrams())
                .isCustomEntry(Boolean.TRUE.equals(request.getIsCustomEntry()) || (recipe == null && ingredient == null))
                .isFromInventory(inventoryGroup != null || Boolean.TRUE.equals(request.getIsFromInventory()))
                .inventoryGroup(inventoryGroup)
                .build();

        DailyConsumption saved = dailyConsumptionService.logConsumption(entity);

        ConsumptionResponse response = new ConsumptionResponse();
        response.setId(saved.getId());
        response.setFoodName(saved.getFoodName());
        response.setRecipeId(saved.getRecipe() != null ? saved.getRecipe().getId() : null);
        response.setIngredientId(saved.getIngredient() != null ? saved.getIngredient().getId() : null);
        response.setInventoryGroupId(saved.getInventoryGroup() != null ? saved.getInventoryGroup().getId() : null);
        response.setPortionLabel(saved.getPortionLabel());
        response.setEstimatedCalories(saved.getEstimatedCalories());
        response.setEstimatedProtein(saved.getEstimatedProtein());
        response.setEstimatedCarbs(saved.getEstimatedCarbs());
        response.setEstimatedFat(saved.getEstimatedFat());
        response.setIsFromInventory(saved.getIsFromInventory());
        response.setConsumedAt(saved.getConsumedAt());
        return response;
    }

    private String requireAuthenticatedUserId(Jwt jwt, String fallbackUserId) {
        if (jwt != null && jwt.getSubject() != null && !jwt.getSubject().isBlank()) {
            return jwt.getSubject();
        }

        if (fallbackUserId != null && !fallbackUserId.isBlank()) {
            return fallbackUserId.trim();
        }

        throw new MealAppDomainException("Kimliği doğrulanmış kullanıcı bilgisi bulunamadı.");
    }

    private String resolveFoodName(ConsumptionRequest request, Recipe recipe, Ingredient ingredient) {
        if (request.getFoodName() != null && !request.getFoodName().isBlank()) {
            return request.getFoodName().trim();
        }
        if (recipe != null) {
            return recipe.getTitle();
        }
        if (ingredient != null) {
            return ingredient.getName();
        }

        throw new MealAppDomainException("Tüketim kaydı için bir tarif, malzeme veya yemek adı girilmelidir.");
    }

    private DailyConsumption.PortionSize resolvePortionSize(ConsumptionRequest request) {
        if (request.getPortionSize() != null) {
            return request.getPortionSize();
        }

        if (request.getPortionMultiplier() != null) {
            if (request.getPortionMultiplier() <= 0.75) {
                return DailyConsumption.PortionSize.SMALL;
            }
            if (request.getPortionMultiplier() <= 1.25) {
                return DailyConsumption.PortionSize.MEDIUM;
            }
            return DailyConsumption.PortionSize.LARGE;
        }

        if (request.getPortionGrams() != null) {
            if (request.getPortionGrams() <= 60) {
                return DailyConsumption.PortionSize.SMALL;
            }
            if (request.getPortionGrams() <= 160) {
                return DailyConsumption.PortionSize.MEDIUM;
            }
            return DailyConsumption.PortionSize.LARGE;
        }

        return DailyConsumption.PortionSize.MEDIUM;
    }
}
