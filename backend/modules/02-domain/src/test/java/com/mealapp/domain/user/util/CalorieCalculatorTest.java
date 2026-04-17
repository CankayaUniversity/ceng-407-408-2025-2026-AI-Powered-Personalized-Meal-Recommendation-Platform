package com.mealapp.domain.user.util;

import com.mealapp.domain.user.entity.User;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class CalorieCalculatorTest {
    
    @Test
    void calculateBmi_ShouldReturnCorrectBmi() {
        // Given
        User user = User.builder()
                .weight(70.0)
                .height(175.0)
                .build();
        
        // When
        Double bmi = CalorieCalculator.calculateBmi(user);
        
        // Then
        // BMI = 70 / (1.75 * 1.75) = 70 / 3.0625 = 22.857...
        assertEquals(22.86, bmi);
    }

    @Test
    void calculateBmi_WithNullValues_ShouldReturnNull() {
        // Given
        User user = User.builder().build();
        
        // When
        Double bmi = CalorieCalculator.calculateBmi(user);
        
        // Then
        assertNull(bmi);
    }

    @Test
    void calculateDailyTarget_ShouldReturnCorrectCaloriesForMale() {
        // Given
        User user = User.builder()
                .gender(User.Gender.MALE)
                .weight(80.0)
                .height(180.0)
                .age(30)
                .activityLevel(User.ActivityLevel.MODERATELY_ACTIVE)
                .dietaryGoal(User.DietaryGoal.MAINTAIN_WEIGHT)
                .build();
        
        // BMR = 88.362 + (13.397 * 80) + (4.799 * 180) - (5.677 * 30)
        // BMR = 88.362 + 1071.76 + 863.82 - 170.31 = 1853.632
        // TDEE = 1853.632 * 1.55 = 2873.1296
        
        // When
        Integer calories = CalorieCalculator.calculateDailyTarget(user);
        
        // Then
        assertEquals(2873, calories);
    }
}
