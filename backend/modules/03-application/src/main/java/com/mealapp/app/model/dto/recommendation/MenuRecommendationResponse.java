package com.mealapp.app.model.dto.recommendation;

import com.mealapp.domain.recipe.entity.RecipeCategory;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
public class MenuRecommendationResponse {
    private LocalDateTime generatedAt;
    private boolean isAiGenerated;
    private List<MenuDto> menus;

    @Data
    public static class MenuDto {
        private int rank;
        private String title;
        private Map<RecipeCategory, MenuCourseRecipeDto> courses;
        private String insight;
        private Double totalKcal;
        private Double totalProtein;
        private Double totalCarbs;
        private Double totalFat;
        private Integer totalPreparationTime;
    }

    @Data
    public static class MenuCourseRecipeDto {
        private Long recommendationRecipeId;
        private Long recipeId;
        private String recipeTitle;
        private RecipeCategory category;
        private boolean isCooked;
        private String imageUrl;
        private Double kcalPerServing;
        private Double proteinPerServing;
        private Double carbsPerServing;
        private Double fatPerServing;
        private Integer preparationTimeMinutes;
        private Integer servings;
        private Double averageRating;
        private Integer ratingCount;
        private Integer totalCookCount;
        private List<String> matchedIngredients;
        private List<String> missingIngredients;
    }
}
