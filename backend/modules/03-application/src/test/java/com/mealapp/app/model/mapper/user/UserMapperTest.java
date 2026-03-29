package com.mealapp.app.model.mapper.user;

import com.mealapp.app.model.dto.user.UserDto;
import com.mealapp.domain.user.entity.User;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class UserMapperTest {
    private final UserMapper mapper = new UserMapper();

    @Test
    void toEntityShouldCalculateDailyCalories() {
        UserDto dto = new UserDto();
        dto.setName("Test User");
        dto.setWeight(80.0);
        dto.setHeight(180.0);
        dto.setAge(25);
        dto.setGender(User.Gender.MALE);
        dto.setActivityLevel(User.ActivityLevel.MODERATELY_ACTIVE);
        dto.setDietaryGoal(User.DietaryGoal.MAINTAIN_WEIGHT);
        dto.setDislikedIngredients(List.of("Cilantro", "Celery"));

        User entity = mapper.toEntity(dto);

        assertNotNull(entity);
        assertEquals("Test User", entity.getName());
        assertEquals(List.of("Cilantro", "Celery"), entity.getDislikedIngredients());
        assertNotNull(entity.getDailyCalorieTarget());
        assertTrue(entity.getDailyCalorieTarget() > 0);
    }

    @Test
    void toDtoShouldMapFields() {
        User entity = User.builder()
                .id("user-1")
                .name("Entity User")
                .dislikedIngredients(List.of("Olives"))
                .dailyCalorieTarget(2500)
                .build();

        UserDto dto = mapper.toDto(entity);

        assertNotNull(dto);
        assertEquals("user-1", dto.getId());
        assertEquals("Entity User", dto.getName());
        assertEquals(List.of("Olives"), dto.getDislikedIngredients());
        assertEquals(2500, dto.getDailyCalorieTarget());
    }
}
