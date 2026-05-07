package com.mealapp.app.model.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminIngredientRequest {
    private String name;
    private String category;
    private Double density;
    private String physicalState;
    private String preferredUnit;
    
    // Besin Değerleri (100g için)
    private Double caloriesPer100g;
    private Double proteinPer100g;
    private Double carbsPer100g;
    private Double fatPer100g;
}
