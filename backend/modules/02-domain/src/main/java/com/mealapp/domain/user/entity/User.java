package com.mealapp.domain.user.entity;

import com.mealapp.domain.common.entity.BaseEntity;
import com.mealapp.domain.inventory.entity.InventoryGroup;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import java.util.List;
import java.time.LocalDateTime;

/**
 * Kullanıcı bilgilerini ve beslenme tercihlerini tutan ana varlık sınıfı.
 * Esnek bir yapıda tasarlanmıştır; ileride yeni tercihler veya profil bilgileri eklenebilir.
 */
@Entity
@Table(name = "users")
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@Getter
@Setter
public class User extends BaseEntity {

    @Id
    @Column(length = 50)
    private String id;

    @Column(nullable = true)
    private String name;

    @Column(unique = true, nullable = true)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private UserRole role = UserRole.USER;

    @Column(name = "profile_image_url")
    private String profileImageUrl;

    @ManyToMany
    @JoinTable(
            name = "user_inventory_groups",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "inventory_group_id")
    )
    @Builder.Default
    private List<InventoryGroup> inventoryGroups = new java.util.ArrayList<>();

    /**
     * Kullanıcının sahip olduğu alerjiler. 
     * Basitlik adına String listesi olarak tutulmuştur, ileride ayrı bir Entity'ye dönüştürülebilir.
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_allergies", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "allergy")
    private List<String> allergies;

    /**
     * Kullanıcının alerjik olmadığı halde tercih etmediği malzemeler.
     * AI öneri akışında soft-constraint olarak kullanılmak üzere saklanır.
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_disliked_ingredients", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "ingredient_name")
    private List<String> dislikedIngredients;

    /**
     * Tercih edilen diyet tipi (Örn: VEGAN, KETO, PALEO).
     */
    @Enumerated(EnumType.STRING)
    private DietType dietType;

    /**
     * Kullanıcının beslenme hedefi.
     */
    @Enumerated(EnumType.STRING)
    private DietaryGoal dietaryGoal;

    /**
     * Kullanıcının fiziksel özellikleri (Kalori hesabı için).
     */
    private Double weight; // kg
    private Double height; // cm
    private Integer age;
    
    @Enumerated(EnumType.STRING)
    private Gender gender;

    @Enumerated(EnumType.STRING)
    private ActivityLevel activityLevel;

    /**
     * Kullanıcının vücut kitle indeksi (Body Mass Index - BMI).
     * Sistem tarafından boy ve kilo bilgisine göre otomatik hesaplanır.
     */
    private Double bmi;

    /**
     * Kullanıcının günlük hedeflediği toplam kalori miktarı.
     * Sistem tarafından boy, kilo, yaş ve hedefe göre otomatik hesaplanır.
     */
    private Integer dailyCalorieTarget;

    public enum DietType {
        NONE, VEGAN, VEGETARIAN, KETO, PALEO, GLUTEN_FREE
    }

    public enum DietaryGoal {
        LOSE_WEIGHT, MAINTAIN_WEIGHT, GAIN_WEIGHT, BUILD_MUSCLE
    }

    public enum Gender {
        MALE, FEMALE, OTHER
    }

    public enum ActivityLevel {
        SEDENTARY, LIGHTLY_ACTIVE, MODERATELY_ACTIVE, VERY_ACTIVE, EXTRA_ACTIVE
    }

    public enum UserRole {
        USER, ADMIN
    }

}
