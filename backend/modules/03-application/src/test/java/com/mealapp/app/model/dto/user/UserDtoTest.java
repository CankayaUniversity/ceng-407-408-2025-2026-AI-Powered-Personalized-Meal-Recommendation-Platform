package com.mealapp.app.model.dto.user;

import com.mealapp.domain.user.entity.User;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class UserDtoTest {
    @Test
    void testUserDtoLombok() {
        UserDto userDto = new UserDto();
        userDto.setId(1L);
        userDto.setName("John Doe");
        userDto.setEmail("john@example.com");
        userDto.setAllergies(List.of("Nuts", "Dairy"));
        userDto.setDietType(User.DietType.VEGAN);
        userDto.setDietaryGoal(User.DietaryGoal.LOSE_WEIGHT);
        userDto.setWeight(80.0);
        userDto.setHeight(180.0);
        userDto.setAge(30);
        userDto.setGender(User.Gender.MALE);
        userDto.setActivityLevel(User.ActivityLevel.MODERATELY_ACTIVE);
        userDto.setDailyCalorieTarget(2000);

        assertEquals(1L, userDto.getId());
        assertEquals("John Doe", userDto.getName());
        assertEquals("john@example.com", userDto.getEmail());
        assertEquals(2, userDto.getAllergies().size());
        assertEquals(User.DietType.VEGAN, userDto.getDietType());
        assertEquals(User.DietaryGoal.LOSE_WEIGHT, userDto.getDietaryGoal());
        assertEquals(80.0, userDto.getWeight());
        assertEquals(180.0, userDto.getHeight());
        assertEquals(30, userDto.getAge());
        assertEquals(User.Gender.MALE, userDto.getGender());
        assertEquals(User.ActivityLevel.MODERATELY_ACTIVE, userDto.getActivityLevel());
        assertEquals(2000, userDto.getDailyCalorieTarget());
        
        UserDto userDto2 = new UserDto();
        userDto2.setId(1L);
        userDto2.setName("John Doe");
        userDto2.setEmail("john@example.com");
        userDto2.setAllergies(List.of("Nuts", "Dairy"));
        userDto2.setDietType(User.DietType.VEGAN);
        userDto2.setDietaryGoal(User.DietaryGoal.LOSE_WEIGHT);
        userDto2.setWeight(80.0);
        userDto2.setHeight(180.0);
        userDto2.setAge(30);
        userDto2.setGender(User.Gender.MALE);
        userDto2.setActivityLevel(User.ActivityLevel.MODERATELY_ACTIVE);
        userDto2.setDailyCalorieTarget(2000);
        
        assertEquals(userDto, userDto2);
        assertEquals(userDto.hashCode(), userDto2.hashCode());
        assertNotNull(userDto.toString());
    }
}
