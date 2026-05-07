package com.mealapp.app.model.dto.recommendation;

import lombok.Data;
import java.util.List;

@Data
public class RecommendationResponse {
    private List<RecipeRecommendationDto> recommendedRecipes;

    @Data
    public static class RecipeRecommendationDto {
        private Long recipeId;
        private String recipeTitle;
        private String insight;
        private List<String> matchedIngredients;
        private List<String> missingIngredients;
        private Double calories;
        private Double protein;
        private Double carbs;
        private Double fat;
        private Integer preparationTimeMinutes;
        private Integer servings;
        private Double averageRating;
        private Integer ratingCount;
        private Double userRating;
        private String imageUrl;
    }
}
