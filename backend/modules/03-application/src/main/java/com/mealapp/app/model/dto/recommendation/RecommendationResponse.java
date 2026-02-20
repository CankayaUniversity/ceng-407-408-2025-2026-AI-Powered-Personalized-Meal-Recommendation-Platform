package com.mealapp.app.model.dto.recommendation;

import lombok.Data;
import java.util.List;

@Data
public class RecommendationResponse {
    private List<String> recommendedRecipes;
    private String aiInsight;
}
