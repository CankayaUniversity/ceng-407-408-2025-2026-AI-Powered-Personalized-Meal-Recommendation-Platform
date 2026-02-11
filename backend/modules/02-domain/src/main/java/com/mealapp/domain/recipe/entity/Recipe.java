package com.mealapp.domain.recipe.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.List;

/**
 * Yemek tariflerini temsil eden varlık sınıfı.
 * AI tarafından önerilen veya sistemde kayıtlı olan tariflerin detaylarını tutar.
 */
@Entity
@Table(name = "recipes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Recipe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    /**
     * Tarifin içeriğindeki malzemeler listesi.
     */
    @ElementCollection
    @CollectionTable(name = "recipe_ingredients", joinColumns = @JoinColumn(name = "recipe_id"))
    @Column(name = "ingredient")
    private List<String> ingredients;

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
     * Zorluk seviyesi (KOLAY, ORTA, ZOR).
     */
    @Enumerated(EnumType.STRING)
    private Difficulty difficulty;

    /**
     * Besin değerleri (Kalori, Karbonhidrat vb. - JSON veya ayrı alanlar olarak tutulabilir).
     */
    private Integer calories;

    public enum Difficulty {
        EASY, MEDIUM, HARD
    }
}
