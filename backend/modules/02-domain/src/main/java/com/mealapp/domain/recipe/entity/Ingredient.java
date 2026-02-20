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

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Double amount;

    private String unit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipe_id")
    private Recipe recipe;
}
