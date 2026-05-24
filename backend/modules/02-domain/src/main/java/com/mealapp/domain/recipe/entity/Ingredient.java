package com.mealapp.domain.recipe.entity;

import com.mealapp.domain.common.entity.BaseEntity;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;
import org.hibernate.annotations.BatchSize;
import jakarta.persistence.*;
import lombok.*;
import java.util.List;
import java.util.Set;
import java.util.ArrayList;
import java.util.HashSet;

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
public class Ingredient extends BaseEntity {

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

    @OneToMany(mappedBy = "ingredient", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    @Fetch(FetchMode.SUBSELECT)
    @BatchSize(size = 20)
    private Set<IngredientUnit> ingredientUnits = new HashSet<>();

    @OneToMany(mappedBy = "ingredient")
    private java.util.List<RecipeIngredient> recipeIngredients;

    /**
     * Malzemenin yoğunluğu (g/ml). Varsayılan 1.0 (su yoğunluğu).
     * Sıvı birimlerden (ml, litre) grama dönüşüm yaparken kullanılır.
     */
    @Builder.Default
    @Column(name = "density", nullable = false)
    private Double density = 1.0;

    /**
     * Malzemenin fiziksel durumu (KATI, SIVI, YARI-KATI).
     * UI'da birim filtreleme için kullanılır.
     */
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "physical_state")
    private PhysicalState physicalState = PhysicalState.SOLID;

    /**
     * Malzeme için öncelikli / tercih edilen birim (Örn: sarımsak için "diş").
     * UI'da hızlı seçim kısmında en başta gösterilir.
     */
    @Column(name = "preferred_unit")
    private String preferredUnit;

    public enum PhysicalState {
        SOLID,      // Katı (g, kg, adet, dilim vb.)
        LIQUID,     // Sıvı (ml, l)
        SEMI_SOLID  // Yarı-katı (yoğurt, bal vb. - her iki grup da aktif)
    }

    public enum Category {
        MEAT,
        VEGETABLE,
        FRUIT,
        DAIRY,
        GRAIN,
        SPICE,
        OIL,
        SEAFOOD,
        SAUCE,
        NUT,
        SWEETENER,
        BEVERAGE,
        EGG,
        LEGUME,
        OTHER
    }
}
