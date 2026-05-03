package com.mealapp.domain.recipe.service;

import com.mealapp.domain.notification.service.NotificationService;
import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.entity.RecipeIngredient;
import com.mealapp.domain.recipe.repository.IngredientRepository;
import com.mealapp.domain.recipe.repository.RecipeRepository;
import com.mealapp.domain.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class RecipeServiceDietTest {

    private RecipeService recipeService;

    @BeforeEach
    void setUp() {
        RecipeRepository recipeRepository = Mockito.mock(RecipeRepository.class);
        IngredientRepository ingredientRepository = Mockito.mock(IngredientRepository.class);
        UnitConverterService unitConverterService = Mockito.mock(UnitConverterService.class);
        com.mealapp.domain.common.storage.FileStorageService fileStorageService = Mockito.mock(com.mealapp.domain.common.storage.FileStorageService.class);
        NotificationService notificationService = Mockito.mock(NotificationService.class);
        UserRepository userRepository = Mockito.mock(UserRepository.class);

        recipeService = new RecipeService(recipeRepository, ingredientRepository, unitConverterService, fileStorageService, notificationService, userRepository);
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