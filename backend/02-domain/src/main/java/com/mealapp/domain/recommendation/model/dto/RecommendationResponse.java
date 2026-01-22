package com.mealapp.domain.recommendation.model.dto;

import lombok.Data;
import java.util.List;

@Data
public class RecommendationResponse {
    private List<String> recommendedRecipes;
    private String aiInsight;
}
