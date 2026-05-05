package com.mealapp.app.model.dto.consumption;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NutritionPreviewResponse {
    private Double calories;
    private Double protein;
    private Double carbs;
    private Double fat;
}
