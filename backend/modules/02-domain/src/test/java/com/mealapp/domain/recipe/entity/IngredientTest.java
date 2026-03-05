package com.mealapp.domain.recipe.entity;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class IngredientTest {
    @Test
    void ingredientBuilderShouldWork() {
        Ingredient ingredient = Ingredient.builder()
                .name("Sugar")
                .category(Ingredient.Category.OTHER)
                .build();

        assertNotNull(ingredient);
        assertEquals("Sugar", ingredient.getName());
        assertEquals(Ingredient.Category.OTHER, ingredient.getCategory());
    }

    @Test
    void ingredientSettersShouldWork() {
        Ingredient ingredient = new Ingredient();
        ingredient.setName("Water");
        ingredient.setCategory(Ingredient.Category.OTHER);

        assertEquals("Water", ingredient.getName());
        assertEquals(Ingredient.Category.OTHER, ingredient.getCategory());
    }
}
