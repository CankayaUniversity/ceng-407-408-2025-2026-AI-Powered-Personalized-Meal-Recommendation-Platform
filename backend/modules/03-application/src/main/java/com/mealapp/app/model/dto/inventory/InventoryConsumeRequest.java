package com.mealapp.app.model.dto.inventory;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryConsumeRequest {

    @NotEmpty
    private Map<String, Double> userAmounts;
}
