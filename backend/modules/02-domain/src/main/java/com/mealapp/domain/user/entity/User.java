package com.mealapp.domain.user.entity;

import com.mealapp.domain.inventory.entity.InventoryGroup;
import jakarta.persistence.*;
import lombok.*;
import java.util.List;
import java.time.LocalDateTime;

/**
 * Kullanıcı bilgilerini ve beslenme tercihlerini tutan ana varlık sınıfı.
 * Esnek bir yapıda tasarlanmıştır; ileride yeni tercihler veya profil bilgileri eklenebilir.
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @Column(length = 50)
    private String id;

    @Column(nullable = true)
    private String name;

    @Column(unique = true, nullable = true)
    private String email;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<InventoryGroup> inventoryGroups;

    /**
     * Kullanıcının sahip olduğu alerjiler. 
     * Basitlik adına String listesi olarak tutulmuştur, ileride ayrı bir Entity'ye dönüştürülebilir.
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_allergies", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "allergy")
    private List<String> allergies;

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
     * Kullanıcının günlük hedeflediği toplam kalori miktarı.
     * Sistem tarafından boy, kilo, yaş ve hedefe göre otomatik hesaplanır.
     */
    private Integer dailyCalorieTarget;

    /**
     * Kayıt ve güncelleme tarihleri (Devamlılık takibi için).
     */
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

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
}
