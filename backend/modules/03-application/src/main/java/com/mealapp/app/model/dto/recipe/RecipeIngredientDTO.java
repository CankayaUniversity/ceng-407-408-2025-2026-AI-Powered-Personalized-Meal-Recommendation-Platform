package com.mealapp.app.model.dto.recipe;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// RecipeIngredientDTO.java (Yeni dosya oluştur veya IngredientDTO'yu genişlet)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecipeIngredientDTO {
    private String name;
    private Double amount;
    private String unit;
}