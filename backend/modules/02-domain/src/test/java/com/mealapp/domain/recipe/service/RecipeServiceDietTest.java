package com.mealapp.domain.recipe.service;

import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.entity.RecipeIngredient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class RecipeServiceDietTest {

    private RecipeService recipeService;

    @BeforeEach
    void setUp() {
        recipeService = new RecipeService(null); // Repository gerekmiyor bu testler için
    }

    @Test
    void shouldBeCompatibleWhenNoRestrictions() {
        Recipe recipe = createRecipe("Pasta", Ingredient.Category.GRAIN);
        assertTrue(recipeService.isCompatibleWithDiet(recipe, "NONE", List.of()));
    }

    @Test
    void shouldNotBeCompatibleWhenAllergenPresent() {
        Recipe recipe = createRecipe("Peanut Butter", Ingredient.Category.NUT, "Peanuts");
        assertFalse(recipeService.isCompatibleWithDiet(recipe, "NONE", List.of("Peanuts")));
    }

    @Test
    void shouldNotBeCompatibleWhenVeganHasDairy() {
        Recipe recipe = createRecipe("Cheesy Pasta", Ingredient.Category.DAIRY);
        assertFalse(recipeService.isCompatibleWithDiet(recipe, "VEGAN", List.of()));
    }

    @Test
    void shouldBeCompatibleWhenVegetarianHasDairy() {
        Recipe recipe = createRecipe("Cheesy Pasta", Ingredient.Category.DAIRY);
        assertTrue(recipeService.isCompatibleWithDiet(recipe, "VEGETARIAN", List.of()));
    }

    @Test
    void shouldNotBeCompatibleWhenVegetarianHasMeat() {
        Recipe recipe = createRecipe("Steak", Ingredient.Category.MEAT);
        assertFalse(recipeService.isCompatibleWithDiet(recipe, "VEGETARIAN", List.of()));
    }

    private Recipe createRecipe(String title, Ingredient.Category category) {
        return createRecipe(title, category, "Some Ingredient");
    }

    private Recipe createRecipe(String title, Ingredient.Category category, String ingredientName) {
        Ingredient ingredient = Ingredient.builder()
                .name(ingredientName)
                .category(category)
                .build();
        
        RecipeIngredient ri = RecipeIngredient.builder()
                .ingredient(ingredient)
                .build();

        return Recipe.builder()
                .title(title)
                .recipeIngredients(List.of(ri))
                .build();
    }
}
