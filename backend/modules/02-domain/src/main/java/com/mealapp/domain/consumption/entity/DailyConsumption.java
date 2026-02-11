package com.mealapp.domain.consumption.entity;

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
     * Tahmini kalori değeri. 
     * Sistem tarifinden gelmişse sabit, dışarıdan girilmişse AI tarafından tahmin edilmiştir.
     */
    private Integer estimatedCalories;

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
     * Tüketim zamanı.
     */
    @Builder.Default
    private LocalDateTime consumedAt = LocalDateTime.now();

    /**
     * Bu yemek sistem dışı (manuel giriş) bir yemek mi?
     */
    private Boolean isCustomEntry;

    public enum MealType {
        BREAKFAST, LUNCH, DINNER, SNACK
    }

    public enum PortionSize {
        SMALL, MEDIUM, LARGE
    }
}
