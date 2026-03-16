package com.mealapp.domain.recipe.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.List;

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
public class Recipe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    /**
     * Tarifin içeriğindeki malzemeler listesi.
     */
    @OneToMany(mappedBy = "recipe", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<RecipeIngredient> recipeIngredients;

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

    public enum Difficulty {
        EASY, MEDIUM, HARD
    }
}
