package com.mealapp.domain.consumption.entity;

import com.mealapp.domain.inventory.entity.InventoryGroup;
import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Kullanıcının gün içinde tükettiği gıdaları takip eden varlık sınıfı.
 * Hem sistemdeki tarifleri hem de dışarıdan girilen yemekleri kapsar.
 */
@Entity
@Table(name = "daily_consumptions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailyConsumption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * Tüketilen gıdanın adı (Örn: "Mercimek Çorbası" veya sistemdeki tarif adı).
     */
    @Column(nullable = false)
    private String foodName;

    /**
     * Eğer sistemdeki bir tarif tüketilmişse onunla olan bağlantı.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipe_id")
    private Recipe recipe;

    /**
     * Eğer doğrudan bir malzeme tüketimi kaydedildiyse onunla olan bağlantı.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ingredient_id")
    private Ingredient ingredient;

    /**
     * Tahmini besin değerleri.
     * Sistem tarifinden gelmişse hesaplanmış, dışarıdan girilmişse AI tarafından tahmin edilmiştir.
     */
    private Integer estimatedCalories;
    private Double estimatedProtein; // gram
    private Double estimatedCarbs;   // gram
    private Double estimatedFat;     // gram

    /**
     * Öğün tipi (KAHVALTI, ÖĞLE, AKŞAM, ATIŞTIRMALIK).
     */
    @Enumerated(EnumType.STRING)
    private MealType mealType;

    /**
     * Porsiyon büyüklüğü tahmini için (SMALL, MEDIUM, LARGE).
     */
    @Enumerated(EnumType.STRING)
    private PortionSize portionSize;

    /**
     * Household unit odaklı porsiyon etiketi (örn: 1 bowl, 1 slice, 1 piece).
     */
    @Column(length = 120)
    private String portionLabel;

    /**
     * Tarif girişlerinde porsiyon katsayısı (örn: 0.5, 1.0, 1.5).
     */
    @Builder.Default
    private Double portionMultiplier = 1.0;

    /**
     * Malzeme bazlı girişlerde household unit'in yaklaşık gram karşılığı.
     */
    private Double portionGrams;

    /**
     * Tüketim zamanı.
     */
    @Builder.Default
    private LocalDateTime consumedAt = LocalDateTime.now();

    /**
     * Bu yemek sistem dışı (manuel giriş) bir yemek mi?
     */
    private Boolean isCustomEntry;

    /**
     * Bu yemek kullanıcının kendi envanterinden mi (evde yapıldı/hazırlandı) tüketildi?
     * Eğer true ise, ilgili tarifin malzemeleri kullanıcının stoklarından düşülür.
     */
    @Builder.Default
    private Boolean isFromInventory = false;

    /**
     * Eğer stoktan tüketildiyse, hangi lokasyondan düşüldüğünü belirtir.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inventory_group_id")
    private InventoryGroup inventoryGroup;

    public enum MealType {
        BREAKFAST, LUNCH, DINNER, SNACK
    }

    public enum PortionSize {
        SMALL, MEDIUM, LARGE
    }
}
