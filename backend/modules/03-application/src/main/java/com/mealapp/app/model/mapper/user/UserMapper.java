package com.mealapp.app.model.mapper.user;

import com.mealapp.app.model.dto.user.UserDto;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.user.util.CalorieCalculator;
import org.springframework.stereotype.Component;

/**
 * Kullanıcı nesneleri arasındaki dönüşümü ve kalori hesabı gibi
 * uygulama seviyesindeki ek mantıkları yönetir.
 */
@Component
public class UserMapper {

    public User toEntity(UserDto dto) {
        if (dto == null) return null;
        
        User user = User.builder()
                .id(dto.getId())
                .name(dto.getName())
                .email(dto.getEmail())
                .allergies(dto.getAllergies())
                .dietType(dto.getDietType())
                .dietaryGoal(dto.getDietaryGoal())
                .weight(dto.getWeight())
                .height(dto.getHeight())
                .age(dto.getAge())
                .gender(dto.getGender())
                .activityLevel(dto.getActivityLevel())
                .build();
        
        // Kayıt/Güncelleme anında kalori hedefini otomatik hesapla
        user.setDailyCalorieTarget(CalorieCalculator.calculateDailyTarget(user));
        
        return user;
    }

    public UserDto toDto(User entity) {
        if (entity == null) return null;
        
        UserDto dto = new UserDto();
        dto.setId(entity.getId());
        dto.setName(entity.getName());
        dto.setEmail(entity.getEmail());
        dto.setAllergies(entity.getAllergies());
        dto.setDietType(entity.getDietType());
        dto.setDietaryGoal(entity.getDietaryGoal());
        dto.setWeight(entity.getWeight());
        dto.setHeight(entity.getHeight());
        dto.setAge(entity.getAge());
        dto.setGender(entity.getGender());
        dto.setActivityLevel(entity.getActivityLevel());
        dto.setDailyCalorieTarget(entity.getDailyCalorieTarget());
        
        return dto;
    }
}
