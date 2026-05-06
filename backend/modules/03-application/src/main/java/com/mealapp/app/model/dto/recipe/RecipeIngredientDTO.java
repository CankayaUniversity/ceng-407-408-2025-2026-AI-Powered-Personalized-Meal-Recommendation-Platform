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
    private Long ingredientId;
    private String name;
    private Double amount;
    private String unit;
    private Double grams;          // Gram cinsinden hesaplanmış toplam miktar
    private Double unitGramWeight; // Birim başına kabul edilen gram ağırlığı
    private Double calories;       // Malzemenin bu tarifteki toplam kalorisi
    private Double protein;        // Malzemenin bu tarifteki toplam proteini
    private Double carbs;          // Malzemenin bu tarifteki toplam karbonhidratı
    private Double fat;            // Malzemenin bu tarifteki toplam yağı
}