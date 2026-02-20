package com.mealapp.app.model.dto.recommendation;

import lombok.Data;
import java.util.List;

@Data
public class RecommendationRequest {
    private Long userId;
    private List<String> availableIngredients;
}
