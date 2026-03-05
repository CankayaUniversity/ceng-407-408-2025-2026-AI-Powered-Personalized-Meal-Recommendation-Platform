package com.mealapp.app.model.dto.user;

import com.mealapp.domain.user.entity.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.List;

/**
 * Kullanıcı kayıt ve profil güncelleme işlemlerinde kullanılan veri transfer nesnesi.
 */
@Data
public class UserDto {
    private Long id;

    @NotBlank(message = "İsim boş bırakılamaz.")
    private String name;

    @NotBlank(message = "E-posta boş bırakılamaz.")
    @Email(message = "Geçerli bir e-posta adresi giriniz.")
    private String email;

    private List<String> allergies;
    private User.DietType dietType;
    private User.DietaryGoal dietaryGoal;
    
    // Fiziksel özellikler
    @NotNull(message = "Kilo bilgisi gereklidir.")
    @Min(value = 20, message = "Kilo en az 20 kg olmalıdır.")
    private Double weight;

    @NotNull(message = "Boy bilgisi gereklidir.")
    @Min(value = 50, message = "Boy en az 50 cm olmalıdır.")
    private Double height;

    @NotNull(message = "Yaş bilgisi gereklidir.")
    @Min(value = 1, message = "Yaş en az 1 olmalıdır.")
    private Integer age;

    @NotNull(message = "Cinsiyet seçilmelidir.")
    private User.Gender gender;

    @NotNull(message = "Aktivite seviyesi seçilmelidir.")
    private User.ActivityLevel activityLevel;
    
    // Sistem tarafından hesaplanan hedef (Response için)
    private Integer dailyCalorieTarget;
}
