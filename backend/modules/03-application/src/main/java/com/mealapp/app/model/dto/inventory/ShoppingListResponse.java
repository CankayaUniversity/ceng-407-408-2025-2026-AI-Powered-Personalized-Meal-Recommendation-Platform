package com.mealapp.app.model.dto.inventory;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShoppingListResponse {
    private List<ShoppingItem> items;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ShoppingItem {
        private Long ingredientId;
        private String ingredientName;
        private Double currentQuantity;
        private String unit;
        private String groupName;
        private String status; // "MISSING" or "LOW"
    }
}
