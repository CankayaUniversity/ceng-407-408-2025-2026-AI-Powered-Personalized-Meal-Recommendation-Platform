package com.mealapp.domain.recipe.service;

import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.entity.RecipeIngredient;
import com.mealapp.domain.recipe.repository.RecipeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class RecipeServiceDietTest {

    private RecipeService recipeService;

    @BeforeEach
    void setUp() {
        // RecipeService artık iki bağımlılığa sahip (Repository ve UnitConverterService)
        // Mockito kullanarak bu bağımlılıkları sahte (mock) olarak oluşturuyoruz
        RecipeRepository recipeRepository = Mockito.mock(RecipeRepository.class);
        UnitConverterService unitConverterService = Mockito.mock(UnitConverterService.class);

        recipeService = new RecipeService(recipeRepository, unitConverterService);
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

    // --- Yardımcı Metotlar ---

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