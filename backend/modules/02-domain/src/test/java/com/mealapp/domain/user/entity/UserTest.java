package com.mealapp.domain.user.entity;

import com.mealapp.domain.inventory.entity.InventoryGroup;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class UserTest {
    @Test
    void builderShouldApplyDefaultsAndProfileFields() {
        User user = User.builder()
                .id("user-1")
                .name("Test User")
                .email("test@example.com")
                .dietType(User.DietType.VEGETARIAN)
                .dietaryGoal(User.DietaryGoal.MAINTAIN_WEIGHT)
                .gender(User.Gender.FEMALE)
                .activityLevel(User.ActivityLevel.LIGHTLY_ACTIVE)
                .build();

        assertEquals("user-1", user.getId());
        assertEquals("Test User", user.getName());
        assertEquals("test@example.com", user.getEmail());
        assertEquals(User.UserRole.USER, user.getRole());
        assertEquals(User.DietType.VEGETARIAN, user.getDietType());
        assertEquals(User.DietaryGoal.MAINTAIN_WEIGHT, user.getDietaryGoal());
        assertEquals(User.Gender.FEMALE, user.getGender());
        assertEquals(User.ActivityLevel.LIGHTLY_ACTIVE, user.getActivityLevel());
        assertTrue(user.isActive());
        assertTrue(user.getInventoryGroups().isEmpty());
    }

    @Test
    void settersShouldUpdateNutritionPreferencesAndGroups() {
        InventoryGroup group = InventoryGroup.builder()
                .id(10L)
                .name("Home")
                .build();

        User user = new User();
        user.setId("user-2");
        user.setAllergies(List.of("peanut"));
        user.setDislikedIngredients(List.of("onion"));
        user.setWeight(70.0);
        user.setHeight(175.0);
        user.setAge(30);
        user.setBmi(22.9);
        user.setDailyCalorieTarget(2200);
        user.setInventoryGroups(List.of(group));

        assertEquals("user-2", user.getId());
        assertEquals(List.of("peanut"), user.getAllergies());
        assertEquals(List.of("onion"), user.getDislikedIngredients());
        assertEquals(70.0, user.getWeight());
        assertEquals(175.0, user.getHeight());
        assertEquals(30, user.getAge());
        assertEquals(22.9, user.getBmi());
        assertEquals(2200, user.getDailyCalorieTarget());
        assertEquals(List.of(group), user.getInventoryGroups());
    }
}
