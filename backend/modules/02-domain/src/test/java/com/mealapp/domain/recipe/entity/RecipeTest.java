package com.mealapp.domain.recipe.entity;

import org.junit.jupiter.api.Test;
import java.util.ArrayList;
import static org.junit.jupiter.api.Assertions.*;

class RecipeTest {
    @Test
    void recipeShouldHandleIngredients() {
        Recipe recipe = Recipe.builder()
                .title("Test Recipe")
                .ingredients(new ArrayList<>())
                .build();

        Ingredient ingredient = Ingredient.builder()
                .name("Salt")
                .amount(1.0)
                .unit("tsp")
                .recipe(recipe)
                .build();

        recipe.getIngredients().add(ingredient);

        assertEquals(1, recipe.getIngredients().size());
        assertEquals("Salt", recipe.getIngredients().getFirst().getName());
        assertEquals(recipe, recipe.getIngredients().getFirst().getRecipe());
    }

    @Test
    void recipeDifficultyEnumShouldWork() {
        Recipe recipe = Recipe.builder()
                .difficulty(Recipe.Difficulty.HARD)
                .build();
        
        assertEquals(Recipe.Difficulty.HARD, recipe.getDifficulty());
    }
}
