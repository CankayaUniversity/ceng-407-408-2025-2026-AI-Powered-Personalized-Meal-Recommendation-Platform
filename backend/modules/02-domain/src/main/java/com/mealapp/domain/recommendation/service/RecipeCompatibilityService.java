package com.mealapp.domain.recommendation.service;

import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.repository.RecipeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.util.Objects;

/**
 * Bir tarifin kullanıcının diyet tercihlerine, alerjilerine ve diğer kriterlerine 
 * uygunluğunu kontrol eden domain servisi.
 */
@Service
@RequiredArgsConstructor
public class RecipeCompatibilityService {

    private final RecipeRepository recipeRepository;

    /**
     * Bir tarifin kullanıcının diyet tipine ve alerjilerine uygunluğunu kontrol eder.
     */
    public boolean isCompatibleWithDiet(Recipe recipe, String dietType, List<String> userAllergies) {
        if (recipe == null) return false;

        // 1. Alerjen kontrolü
        if (userAllergies != null && !userAllergies.isEmpty() && recipe.getRecipeIngredients() != null) {
            boolean hasAllergen = recipe.getRecipeIngredients().stream()
                .anyMatch(ri -> ri.getIngredient() != null &&
                    userAllergies.stream().anyMatch(allergen ->
                        containsAllergen(ri.getIngredient().getName(), allergen)));
            if (hasAllergen) return false;
        }

        // 2. Diyet tipi kontrolü
        if (dietType != null && !dietType.equals("NONE")) {
            if (dietType.equalsIgnoreCase("VEGAN")) {
                return isVeganFriendly(recipe);
            }
            if (dietType.equalsIgnoreCase("VEGETARIAN")) {
                return isVegetarianFriendly(recipe);
            }
        }

        return true;
    }

    /**
     * Verilen malzemeleri içeren tarifleri filtreler.
     */
    public List<Recipe> findByIngredients(List<String> ingredientNames) {
        return recipeRepository.findByIngredientNamesIn(ingredientNames);
    }

    private boolean isVeganFriendly(Recipe recipe) {
        if (recipe.getRecipeIngredients() == null) return true;
        return recipe.getRecipeIngredients().stream()
            .noneMatch(ri -> isAnimalProduct(ri.getIngredient()));
    }

    private boolean isVegetarianFriendly(Recipe recipe) {
        if (recipe.getRecipeIngredients() == null) return true;
        return recipe.getRecipeIngredients().stream()
            .noneMatch(ri -> isMeatProduct(ri.getIngredient()));
    }

    private boolean isAnimalProduct(Ingredient ingredient) {
        if (ingredient == null) return false;
        Ingredient.Category cat = ingredient.getCategory();
        return cat == Ingredient.Category.MEAT ||
            cat == Ingredient.Category.DAIRY ||
            cat == Ingredient.Category.EGG ||
            cat == Ingredient.Category.SEAFOOD;
    }

    private boolean isMeatProduct(Ingredient ingredient) {
        if (ingredient == null) return false;
        Ingredient.Category cat = ingredient.getCategory();
        return cat == Ingredient.Category.MEAT ||
            cat == Ingredient.Category.SEAFOOD;
    }

    private boolean containsAllergen(String ingredientName, String allergen) {
        String ingredientKey = normalizeKey(ingredientName);
        String allergenKey = normalizeKey(allergen);

        return !ingredientKey.isBlank()
            && !allergenKey.isBlank()
            && (ingredientKey.contains(allergenKey) || allergenKey.contains(ingredientKey));
    }

    private String normalizeKey(String value) {
        return Objects.toString(value, "")
            .trim()
            .toLowerCase(Locale.ROOT);
    }
}
