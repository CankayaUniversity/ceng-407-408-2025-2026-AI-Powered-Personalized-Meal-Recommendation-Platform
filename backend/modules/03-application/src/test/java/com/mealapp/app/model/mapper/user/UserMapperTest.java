package com.mealapp.app.model.mapper.user;

import com.mealapp.app.model.dto.user.UserDto;
import com.mealapp.domain.user.entity.User;
import org.junit.jupiter.api.Test;
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

        User entity = mapper.toEntity(dto);

        assertNotNull(entity);
        assertEquals("Test User", entity.getName());
        assertNotNull(entity.getDailyCalorieTarget());
        assertTrue(entity.getDailyCalorieTarget() > 0);
    }

    @Test
    void toDtoShouldMapFields() {
        User entity = User.builder()
                .id(1L)
                .name("Entity User")
                .dailyCalorieTarget(2500)
                .build();

        UserDto dto = mapper.toDto(entity);

        assertNotNull(dto);
        assertEquals(1L, dto.getId());
        assertEquals("Entity User", dto.getName());
        assertEquals(2500, dto.getDailyCalorieTarget());
    }
}
