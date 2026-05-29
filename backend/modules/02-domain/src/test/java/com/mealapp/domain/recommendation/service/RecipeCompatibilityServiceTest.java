package com.mealapp.domain.recommendation.service;

import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.entity.RecipeIngredient;
import com.mealapp.domain.recipe.repository.RecipeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class RecipeCompatibilityServiceTest {

    private RecipeCompatibilityService compatibilityService;

    @BeforeEach
    void setUp() {
        RecipeRepository recipeRepository = Mockito.mock(RecipeRepository.class);
        compatibilityService = new RecipeCompatibilityService(recipeRepository);
    }

    @Test
    void shouldBeCompatibleWhenNoRestrictions() {
        Recipe recipe = createRecipe("Pasta", Ingredient.Category.GRAIN);
        assertTrue(compatibilityService.isCompatibleWithDiet(recipe, "NONE", List.of()));
    }

    @Test
    void shouldNotBeCompatibleWhenAllergenPresent() {
        Recipe recipe = createRecipe("Peanut Butter", Ingredient.Category.NUT, "Peanuts");
        assertFalse(compatibilityService.isCompatibleWithDiet(recipe, "NONE", List.of("Peanuts")));
    }

    @Test
    void shouldNotBeCompatibleWhenIngredientContainsAllergen() {
        Recipe recipe = createRecipe("Chicken Bowl", Ingredient.Category.MEAT, "Tavuk Gogsu");
        assertFalse(compatibilityService.isCompatibleWithDiet(recipe, "NONE", List.of("tavuk")));
    }

    @Test
    void shouldNotBeCompatibleWhenVeganHasDairy() {
        Recipe recipe = createRecipe("Cheesy Pasta", Ingredient.Category.DAIRY);
        assertFalse(compatibilityService.isCompatibleWithDiet(recipe, "VEGAN", List.of()));
    }

    @Test
    void shouldBeCompatibleWhenVegetarianHasDairy() {
        Recipe recipe = createRecipe("Cheesy Pasta", Ingredient.Category.DAIRY);
        assertTrue(compatibilityService.isCompatibleWithDiet(recipe, "VEGETARIAN", List.of()));
    }

    @Test
    void shouldNotBeCompatibleWhenVegetarianHasMeat() {
        Recipe recipe = createRecipe("Steak", Ingredient.Category.MEAT);
        assertFalse(compatibilityService.isCompatibleWithDiet(recipe, "VEGETARIAN", List.of()));
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
            .amount(1.0)
            .unit("adet")
            .grams(100.0)
            .build();

        return Recipe.builder()
            .title(title)
            .recipeIngredients(List.of(ri))
            .build();
    }
}
