package com.mealapp.app.model.dto.user;

import com.mealapp.domain.user.entity.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.util.List;

/**
 * Kullanıcı kayıt ve profil güncelleme işlemlerinde kullanılan veri transfer nesnesi.
 */
@Data
public class UserDto {
    @NotBlank(message = "{validation.user.id.required}")
    private String id;

    private String name;

    @Email(message = "{validation.user.email.invalid}")
    private String email;

    private String profileImageUrl;

    private List<String> allergies;
    private List<String> dislikedIngredients;
    private User.DietType dietType;
    private User.DietaryGoal dietaryGoal;
    
    // Fiziksel özellikler
    private Double weight;
    private Double height;
    private Integer age;
    private User.Gender gender;
    private User.ActivityLevel activityLevel;
    
    // Sistem tarafından hesaplanan hedefler (Response için)
    private Integer dailyCalorieTarget;
    private Double bmi;
}
