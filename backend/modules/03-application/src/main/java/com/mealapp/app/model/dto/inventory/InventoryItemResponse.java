package com.mealapp.app.model.dto.inventory;

import com.mealapp.app.model.dto.recipe.IngredientDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryItemResponse {
    private Long id;
    private Long inventoryGroupId;
    private Long ingredientId;
    private Double quantity; // This should be the display quantity (e.g. 1500 for ml)
    private Double grams;    // This is the absolute weight in grams (e.g. 1545 for 1500ml milk)
    private String unit;
    private IngredientDTO ingredient;
}
