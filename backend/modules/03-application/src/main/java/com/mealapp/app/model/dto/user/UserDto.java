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
    @NotBlank(message = "Kullanıcı ID zorunludur")
    private String id;

    private String name;

    @Email(message = "Geçerli bir e-posta adresi giriniz")
    private String email;

    private List<String> allergies;
    private User.DietType dietType;
    private User.DietaryGoal dietaryGoal;
    
    // Fiziksel özellikler
    private Double weight;
    private Double height;
    private Integer age;
    private User.Gender gender;
    private User.ActivityLevel activityLevel;
    
    // Sistem tarafından hesaplanan hedef (Response için)
    private Integer dailyCalorieTarget;
}
