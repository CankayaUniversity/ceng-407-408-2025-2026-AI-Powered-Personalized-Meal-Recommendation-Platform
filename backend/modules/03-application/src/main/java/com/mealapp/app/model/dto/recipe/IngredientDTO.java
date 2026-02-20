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
    private Double amount;
    private String unit;
}
