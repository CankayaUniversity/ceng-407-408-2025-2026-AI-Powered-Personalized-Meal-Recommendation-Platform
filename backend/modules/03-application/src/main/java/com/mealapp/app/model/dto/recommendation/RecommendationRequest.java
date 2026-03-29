package com.mealapp.app.model.dto.recommendation;

import lombok.Data;
import java.util.List;

@Data
public class RecommendationRequest {
    private String userId;
    private List<String> availableIngredients;
    private List<String> dislikedIngredients;
}
