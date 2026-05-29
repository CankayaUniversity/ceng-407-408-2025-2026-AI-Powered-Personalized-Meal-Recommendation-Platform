package com.mealapp.domain.inventory.entity;

import com.mealapp.domain.recipe.entity.Ingredient;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class InventoryTest {
    @Test
    void builderShouldStoreIngredientGroupQuantityAndUnit() {
        Ingredient ingredient = Ingredient.builder()
                .id(1L)
                .name("Rice")
                .build();
        InventoryGroup group = InventoryGroup.builder()
                .id(2L)
                .name("Pantry")
                .build();

        Inventory inventory = Inventory.builder()
                .id(3L)
                .ingredient(ingredient)
                .inventoryGroup(group)
                .quantity(1000.0)
                .unit("GRAM")
                .build();

        assertEquals(3L, inventory.getId());
        assertEquals(ingredient, inventory.getIngredient());
        assertEquals(group, inventory.getInventoryGroup());
        assertEquals(1000.0, inventory.getQuantity());
        assertEquals("GRAM", inventory.getUnit());
    }

    @Test
    void settersShouldUpdateMutableFields() {
        Ingredient ingredient = Ingredient.builder().name("Milk").build();
        InventoryGroup group = InventoryGroup.builder().name("Fridge").build();

        Inventory inventory = new Inventory();
        inventory.setIngredient(ingredient);
        inventory.setInventoryGroup(group);
        inventory.setQuantity(2.0);
        inventory.setUnit("LITER");

        assertEquals(ingredient, inventory.getIngredient());
        assertEquals(group, inventory.getInventoryGroup());
        assertEquals(2.0, inventory.getQuantity());
        assertEquals("LITER", inventory.getUnit());
    }
}
