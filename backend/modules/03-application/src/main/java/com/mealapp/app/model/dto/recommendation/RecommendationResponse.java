package com.mealapp.app.model.dto.recommendation;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class RecommendationResponse {
    private Long id;
    private LocalDateTime createdAt;
    private String cravings;
    private boolean isAiGenerated;
    private List<RecipeRecommendationDto> recommendedRecipes;

    @Data
    public static class RecipeRecommendationDto {
        private Long recommendationRecipeId; // recommended_recipes tablosundaki ID
        private Long recipeId;
        private String recipeTitle;
        private String insight;
        private Integer userRating;
        private String userComment;
        private boolean isCooked;
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
        private String imageUrl;
        private Integer totalCookCount;
    }
}
