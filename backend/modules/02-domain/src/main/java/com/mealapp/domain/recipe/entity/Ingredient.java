package com.mealapp.domain.recipe.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Tariflerdeki her bir malzemeyi temsil eden varlık sınıfı.
 */
@Entity
@Table(name = "ingredients")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Ingredient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    /**
     * Malzeme kategorisi (Örn: Sebze, Meyve, Baharat).
     */
    @Enumerated(EnumType.STRING)
    private Category category;

    @OneToOne(mappedBy = "ingredient", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private IngredientNutrition nutrition;

    @OneToMany(mappedBy = "ingredient")
    private java.util.List<RecipeIngredient> recipeIngredients;

    public enum Category {
        MEAT,
        VEGETABLE,
        FRUIT,
        DAIRY,
        GRAIN,
        SPICE,
        OIL,
        OTHER
    }
}
