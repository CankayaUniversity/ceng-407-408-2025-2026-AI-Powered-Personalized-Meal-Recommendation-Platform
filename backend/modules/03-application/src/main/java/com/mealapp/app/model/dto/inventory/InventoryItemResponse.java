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
    private Double quantity;
    private String unit;
    private IngredientDTO ingredient;
}
