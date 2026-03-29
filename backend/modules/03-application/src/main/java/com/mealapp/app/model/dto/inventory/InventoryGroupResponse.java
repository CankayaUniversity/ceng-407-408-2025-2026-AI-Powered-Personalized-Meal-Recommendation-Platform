package com.mealapp.app.model.dto.inventory;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryGroupResponse {
    private Long id;
    private String name;
    private String icon;
    private int itemCount;
    private List<InventoryItemResponse> items;
}
