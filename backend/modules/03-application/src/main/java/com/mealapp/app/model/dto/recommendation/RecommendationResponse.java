package com.mealapp.app.model.dto.recommendation;

import lombok.Data;
import java.util.List;

@Data
public class RecommendationResponse {
    private List<RecipeRecommendationDto> recommendedRecipes;

    @Data
    public static class RecipeRecommendationDto {
        private String recipeTitle;
        private String insight;
    }
}
