package com.mealapp.domain.recipe.entity;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class IngredientTest {
    @Test
    void ingredientBuilderShouldWork() {
        Recipe recipe = Recipe.builder().title("Test Recipe").build();
        Ingredient ingredient = Ingredient.builder()
                .name("Sugar")
                .amount(2.0)
                .unit("cups")
                .recipe(recipe)
                .build();

        assertNotNull(ingredient);
        assertEquals("Sugar", ingredient.getName());
        assertEquals(2.0, ingredient.getAmount());
        assertEquals("cups", ingredient.getUnit());
        assertEquals(recipe, ingredient.getRecipe());
    }

    @Test
    void ingredientSettersShouldWork() {
        Ingredient ingredient = new Ingredient();
        ingredient.setName("Water");
        ingredient.setAmount(1.0);
        ingredient.setUnit("L");

        assertEquals("Water", ingredient.getName());
        assertEquals(1.0, ingredient.getAmount());
        assertEquals("L", ingredient.getUnit());
    }
}
