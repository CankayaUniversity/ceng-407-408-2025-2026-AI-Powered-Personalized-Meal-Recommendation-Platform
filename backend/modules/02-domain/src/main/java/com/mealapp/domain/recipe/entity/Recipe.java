package com.mealapp.domain.recipe.entity;

import com.mealapp.domain.common.entity.BaseEntity;
import com.mealapp.domain.user.entity.User;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;
import org.hibernate.annotations.BatchSize;
import jakarta.persistence.*;
import lombok.*;
import java.util.List;
import java.util.ArrayList;

/**
 * Yemek tariflerini temsil eden varlık sınıfı.
 * AI tarafından önerilen veya sistemde kayıtlı olan tariflerin detaylarını tutar.
 */
@Entity
@Table(name = "recipes", indexes = @Index(name = "idx_recipes_title", columnList = "title"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Recipe extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    /**
     * Tarifin içeriğindeki malzemeler listesi.
     */
    @OneToMany(mappedBy = "recipe", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Fetch(FetchMode.SUBSELECT)
    @BatchSize(size = 20)
    private List<RecipeIngredient> recipeIngredients;

    /**
     * Tarifin kategorisi (Örn: Çorba, Ana Yemek, Tatlı).
     */
    @Enumerated(EnumType.STRING)
    private RecipeCategory category;

    /**
     * Tarifin diyet tipi (Örn: VEGAN, VEGETARIAN).
     */
    @Enumerated(EnumType.STRING)
    private User.DietType dietType;

    /**
     * Adım adım hazırlama talimatları.
     */
    @Column(columnDefinition = "TEXT")
    private String instructions;

    /**
     * Hazırlama süresi (Dakika bazında).
     */
    private Integer preparationTimeMinutes;

    /**
     * Kişi sayısı.
     */
    private Integer servings;

    /**
     * Zorluk seviyesi (KOLAY, ORTA, ZOR).
     */
    @Enumerated(EnumType.STRING)
    private Difficulty difficulty;

    /**
     * Tarifin ortalama puanı (Rating sistemi için).
     */
    @Column(nullable = false)
    @Builder.Default
    private Double averageRating = 0.0;

    /**
     * Toplam değerlendirme sayısı.
     */
    @Column(nullable = false)
    @Builder.Default
    private Integer ratingCount = 0;

    /**
     * Toplam kalori miktarı (Tüm malzemeler bazında).
     */
    private Double totalCalories;

    /**
     * Toplam protein miktarı (Gram).
     */
    private Double totalProtein;

    /**
     * Toplam karbonhidrat miktarı (Gram).
     */
    private Double totalCarbs;

    /**
     * Toplam yağ miktarı (Gram).
     */
    private Double totalFat;

    /**
     * Tarifin görsel URL'si.
     */
    private String imageUrl;

    /**
     * Tarifin yayınlanma statüsü.
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private RecipeStatus status = RecipeStatus.APPROVED;

    /**
     * Tarifin toplam pişirilme/yapılma sayısı.
     */
    @Column(nullable = false)
    @Builder.Default
    private Integer totalCookCount = 0;

    /**
     * Eğer bu tarif bir güncelleme ise (APPROVED bir tarifin yeni versiyonu), 
     * orijinal tarifin ID'sini tutar.
     */
    private Long parentId;

    /**
     * Aynı tarif ailesi içindeki sürüm numarası. Ana tarif v1 olarak başlar,
     * her revizyon yeni bir numara alır.
     */
    @Column(nullable = false)
    @Builder.Default
    private Integer versionNumber = 1;

    /**
     * Tarifi oluşturan kullanıcının ID'si.
     */
    private String createdBy;

    /**
     * Malzeme listesi veya miktarı değiştiğinde besin değerlerini yeniden hesaplamak için kullanılır.
     * Bu işlem RecipeService üzerinden kontrollü bir şekilde tetiklenmelidir.
     */
    public void markAsUpdated() {
        // Bu metot, gelecekte otomatik tetikleme mekanizmaları için kanca (hook) olarak kullanılabilir.
    }

    public enum Difficulty {
        EASY, MEDIUM, HARD
    }
}
