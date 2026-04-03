package com.mealapp.app.model.dto.recipe;

import lombok.*;

/**
 * Malzeme veri transfer nesnesi.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IngredientDTO {
    private Long id;
    private String name;
    private String category;
    private Double density;
    private String physicalState;
    private Double caloriesPer100g;
    private Double proteinPer100g;
    private Double carbsPer100g;
    private Double fatPer100g;
}
