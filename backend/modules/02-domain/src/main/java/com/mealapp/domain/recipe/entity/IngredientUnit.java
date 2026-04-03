package com.mealapp.domain.recipe.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Malzemeye özel birim-gramaj eşleşmelerini tutar.
 * Örneğin: Domates için "adet" -> 150g, Yumurta için "adet" -> 50g.
 */
@Entity
@Table(name = "ingredient_units", uniqueConstraints = @UniqueConstraint(columnNames = {"ingredient_id", "unit_name"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IngredientUnit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ingredient_id", nullable = false)
    private Ingredient ingredient;

    @Column(name = "unit_name", nullable = false)
    private String unitName;

    @Column(nullable = false)
    private Double grams;
}
