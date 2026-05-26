package com.mealapp.domain.consumption.entity;

import com.mealapp.domain.inventory.entity.InventoryGroup;
import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.user.entity.User;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class DailyConsumptionTest {
    @Test
    void builderShouldApplyDefaults() {
        User user = User.builder().id("user-1").build();

        DailyConsumption consumption = DailyConsumption.builder()
                .user(user)
                .foodName("Apple")
                .mealType(DailyConsumption.MealType.SNACK)
                .portionSize(DailyConsumption.PortionSize.SMALL)
                .build();

        assertEquals(user, consumption.getUser());
        assertEquals("Apple", consumption.getFoodName());
        assertEquals(DailyConsumption.MealType.SNACK, consumption.getMealType());
        assertEquals(DailyConsumption.PortionSize.SMALL, consumption.getPortionSize());
        assertEquals(1.0, consumption.getPortionMultiplier());
        assertFalse(consumption.getIsFromInventory());
        assertNotNull(consumption.getConsumedAt());
    }

    @Test
    void settersShouldStoreRecipeIngredientNutritionAndInventoryFields() {
        Recipe recipe = Recipe.builder().id(1L).title("Soup").build();
        Ingredient ingredient = Ingredient.builder().id(2L).name("Lentil").build();
        InventoryGroup group = InventoryGroup.builder().id(3L).name("Home").build();
        LocalDateTime consumedAt = LocalDateTime.of(2026, 5, 26, 12, 0);

        DailyConsumption consumption = new DailyConsumption();
        consumption.setRecipe(recipe);
        consumption.setIngredient(ingredient);
        consumption.setInventoryGroup(group);
        consumption.setEstimatedCalories(320);
        consumption.setEstimatedProtein(18.5);
        consumption.setEstimatedCarbs(45.0);
        consumption.setEstimatedFat(7.5);
        consumption.setPortionLabel("1 bowl");
        consumption.setPortionMultiplier(1.5);
        consumption.setPortionGrams(300.0);
        consumption.setConsumedAt(consumedAt);
        consumption.setIsCustomEntry(true);
        consumption.setIsFromInventory(true);

        assertEquals(recipe, consumption.getRecipe());
        assertEquals(ingredient, consumption.getIngredient());
        assertEquals(group, consumption.getInventoryGroup());
        assertEquals(320, consumption.getEstimatedCalories());
        assertEquals(18.5, consumption.getEstimatedProtein());
        assertEquals(45.0, consumption.getEstimatedCarbs());
        assertEquals(7.5, consumption.getEstimatedFat());
        assertEquals("1 bowl", consumption.getPortionLabel());
        assertEquals(1.5, consumption.getPortionMultiplier());
        assertEquals(300.0, consumption.getPortionGrams());
        assertEquals(consumedAt, consumption.getConsumedAt());
        assertEquals(true, consumption.getIsCustomEntry());
        assertEquals(true, consumption.getIsFromInventory());
    }
}
