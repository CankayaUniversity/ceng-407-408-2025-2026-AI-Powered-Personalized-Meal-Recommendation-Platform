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
                .dislikedIngredients(dto.getDislikedIngredients())
                .dietType(dto.getDietType())
                .dietaryGoal(dto.getDietaryGoal())
                .weight(dto.getWeight())
                .height(dto.getHeight())
                .age(dto.getAge())
                .gender(dto.getGender())
                .activityLevel(dto.getActivityLevel())
                .profileImageUrl(dto.getProfileImageUrl())
                .build();
        
        // Kayıt/Güncelleme anında kalori hedefini ve BMI değerini otomatik hesapla
        user.setDailyCalorieTarget(CalorieCalculator.calculateDailyTarget(user));
        user.setBmi(CalorieCalculator.calculateBmi(user));
        
        return user;
    }

    public UserDto toDto(User entity) {
        if (entity == null) return null;
        
        UserDto dto = new UserDto();
        dto.setId(entity.getId());
        dto.setName(entity.getName());
        dto.setEmail(entity.getEmail());
        dto.setAllergies(entity.getAllergies());
        dto.setDislikedIngredients(entity.getDislikedIngredients());
        dto.setDietType(entity.getDietType());
        dto.setDietaryGoal(entity.getDietaryGoal());
        dto.setWeight(entity.getWeight());
        dto.setHeight(entity.getHeight());
        dto.setAge(entity.getAge());
        dto.setGender(entity.getGender());
        dto.setActivityLevel(entity.getActivityLevel());
        dto.setDailyCalorieTarget(entity.getDailyCalorieTarget());
        dto.setProfileImageUrl(entity.getProfileImageUrl());
        
        // Eğer veritabanında henüz BMI hesaplanmamışsa (eski kayıtlar için), çalışma zamanında hesapla
        Double bmi = entity.getBmi();
        if (bmi == null) {
            bmi = CalorieCalculator.calculateBmi(entity);
        }
        dto.setBmi(bmi);
        
        return dto;
    }
}
