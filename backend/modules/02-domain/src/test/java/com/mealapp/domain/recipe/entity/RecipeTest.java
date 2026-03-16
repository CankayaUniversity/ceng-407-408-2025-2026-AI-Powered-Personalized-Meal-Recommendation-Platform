package com.mealapp.domain.recipe.entity;

import org.junit.jupiter.api.Test;
import java.util.ArrayList;
import static org.junit.jupiter.api.Assertions.*;

class RecipeTest {
    @Test
    void recipeShouldHandleIngredients() {
        Recipe recipe = Recipe.builder()
                .title("Test Recipe")
                .recipeIngredients(new ArrayList<>())
                .build();

        Ingredient ingredient = Ingredient.builder()
                .name("Salt")
                .category(Ingredient.Category.SPICE)
                .build();

        RecipeIngredient recipeIngredient = RecipeIngredient.builder()
                .recipe(recipe)
                .ingredient(ingredient)
                .grams(5.0)
                .build();

        recipe.getRecipeIngredients().add(recipeIngredient);

        assertEquals(1, recipe.getRecipeIngredients().size());
        assertEquals("Salt", recipe.getRecipeIngredients().getFirst().getIngredient().getName());
        assertEquals(recipe, recipe.getRecipeIngredients().getFirst().getRecipe());
    }

    @Test
    void recipeDifficultyEnumShouldWork() {
        Recipe recipe = Recipe.builder()
                .difficulty(Recipe.Difficulty.HARD)
                .build();
        
        assertEquals(Recipe.Difficulty.HARD, recipe.getDifficulty());
    }
}
