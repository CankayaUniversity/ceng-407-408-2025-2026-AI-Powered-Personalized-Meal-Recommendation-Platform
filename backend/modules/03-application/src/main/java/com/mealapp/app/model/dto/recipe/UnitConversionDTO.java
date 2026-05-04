package com.mealapp.app.model.dto.recipe;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UnitConversionDTO {
    private String unit;
    private Double amount;
    private String displayName;
    private boolean highPriority;
}
