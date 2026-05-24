package com.mealapp.domain.recommendation.service;

import com.mealapp.domain.inventory.entity.Inventory;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.entity.RecipeIngredient;
import com.mealapp.domain.recipe.service.UnitConverterService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Malzeme eşleşme skorunu (Match Score) hesaplayan domain servisi.
 */
@Service
@RequiredArgsConstructor
public class IngredientMatchService {

    private final UnitConverterService unitConverterService;

    /**
     * Tarifin envanterdeki malzemelerle eşleşme oranını hesaplar.
     * Skor 0.0 ile 1.0 arasındadır.
     * Miktar kontrolü (quantity check) eklenmiştir: 
     * - Malzeme envanterde yoksa -> 0 puan
     * - Malzeme envanterde var ama miktar yetersizse -> Kısmi puan (mevcut/gereken * 0.5)
     * - Malzeme envanterde var ve miktar yeterliyse -> Tam puan (1.0)
     */
    public double calculateMatchScore(Recipe recipe, List<Inventory> inventory) {
        if (recipe.getRecipeIngredients() == null || recipe.getRecipeIngredients().isEmpty()) {
            return 0.0;
        }

        InventoryIndex inventoryIndex = buildInventoryIndex(inventory);

        double totalScore = 0.0;
        for (RecipeIngredient ri : recipe.getRecipeIngredients()) {
            if (ri.getIngredient() == null) {
                continue;
            }

            totalScore += ingredientScore(ri, inventoryIndex);
        }

        return totalScore / recipe.getRecipeIngredients().size();
    }

    public List<String> getMatchedIngredientNames(Recipe recipe, List<Inventory> inventory) {
        return getIngredientNamesByAvailability(recipe, inventory, true);
    }

    public List<String> getMissingIngredientNames(Recipe recipe, List<Inventory> inventory) {
        return getIngredientNamesByAvailability(recipe, inventory, false);
    }

    private List<String> getIngredientNamesByAvailability(Recipe recipe, List<Inventory> inventory, boolean matched) {
        if (recipe == null || recipe.getRecipeIngredients() == null || recipe.getRecipeIngredients().isEmpty()) {
            return List.of();
        }

        InventoryIndex inventoryIndex = buildInventoryIndex(inventory);
        return recipe.getRecipeIngredients().stream()
                .filter(ri -> ri != null && ri.getIngredient() != null)
                .filter(ri -> hasEnoughStock(ri, inventoryIndex) == matched)
                .map(this::ingredientName)
                .filter(name -> !name.isBlank())
                .collect(Collectors.toCollection(LinkedHashSet::new))
                .stream()
                .toList();
    }

    private double ingredientScore(RecipeIngredient recipeIngredient, InventoryIndex inventoryIndex) {
        double requiredGrams = requiredGrams(recipeIngredient);
        double availableGrams = availableGrams(recipeIngredient, inventoryIndex);

        if (availableGrams <= 0) {
            return 0.0;
        }
        if (requiredGrams <= 0 || availableGrams >= requiredGrams) {
            return 1.0;
        }

        return Math.min(0.5, (availableGrams / requiredGrams) * 0.5);
    }

    private boolean hasEnoughStock(RecipeIngredient recipeIngredient, InventoryIndex inventoryIndex) {
        double availableGrams = availableGrams(recipeIngredient, inventoryIndex);
        if (availableGrams <= 0) {
            return false;
        }

        double requiredGrams = requiredGrams(recipeIngredient);
        return requiredGrams <= 0 || availableGrams >= requiredGrams;
    }

    private InventoryIndex buildInventoryIndex(List<Inventory> inventory) {
        Map<Long, Double> gramsByIngredientId = new java.util.HashMap<>();
        Map<String, Double> gramsByIngredientName = new java.util.HashMap<>();

        List<Inventory> safeInventory = inventory == null ? List.of() : inventory;
        for (Inventory item : safeInventory) {
            if (item == null || item.getIngredient() == null || item.getQuantity() == null || item.getQuantity() <= 0) {
                continue;
            }

            double grams = unitConverterService.convertToGrams(item.getQuantity(), item.getUnit(), item.getIngredient());
            if (grams <= 0) {
                continue;
            }

            if (item.getIngredient().getId() != null) {
                gramsByIngredientId.merge(item.getIngredient().getId(), grams, Double::sum);
            }

            String nameKey = normalizeKey(item.getIngredient().getName());
            if (!nameKey.isBlank()) {
                gramsByIngredientName.merge(nameKey, grams, Double::sum);
            }
        }

        return new InventoryIndex(gramsByIngredientId, gramsByIngredientName);
    }

    private double availableGrams(RecipeIngredient recipeIngredient, InventoryIndex inventoryIndex) {
        if (recipeIngredient.getIngredient() == null) {
            return 0.0;
        }

        if (recipeIngredient.getIngredient().getId() != null) {
            Double byId = inventoryIndex.gramsByIngredientId().get(recipeIngredient.getIngredient().getId());
            if (byId != null) {
                return byId;
            }
        }

        return inventoryIndex.gramsByIngredientName().getOrDefault(normalizeKey(recipeIngredient.getIngredient().getName()), 0.0);
    }

    private double requiredGrams(RecipeIngredient recipeIngredient) {
        if (recipeIngredient.getGrams() != null && recipeIngredient.getGrams() > 0) {
            return recipeIngredient.getGrams();
        }

        if (recipeIngredient.getAmount() != null && recipeIngredient.getAmount() > 0) {
            return unitConverterService.convertToGrams(
                    recipeIngredient.getAmount(),
                    recipeIngredient.getUnit(),
                    recipeIngredient.getIngredient()
            );
        }

        return 0.0;
    }

    private String ingredientName(RecipeIngredient recipeIngredient) {
        return recipeIngredient.getIngredient().getName() == null
                ? ""
                : recipeIngredient.getIngredient().getName().trim();
    }

    private String normalizeKey(String value) {
        return Objects.toString(value, "").trim().toLowerCase(Locale.ROOT);
    }

    private record InventoryIndex(Map<Long, Double> gramsByIngredientId, Map<String, Double> gramsByIngredientName) {}
}
