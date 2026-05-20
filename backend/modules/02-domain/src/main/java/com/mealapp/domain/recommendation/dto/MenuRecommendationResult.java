package com.mealapp.domain.recommendation.dto;

import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.entity.RecipeCategory;
import lombok.Builder;
import lombok.Value;

import java.util.List;
import java.util.Map;

@Value
@Builder
public class MenuRecommendationResult {
    boolean aiGenerated;
    List<MenuAlternative> menus;

    @Value
    @Builder
    public static class MenuAlternative {
        int rank;
        String title;
        Map<RecipeCategory, Recipe> courses;
        String insight;
        double totalKcal;
        double totalProtein;
        double totalCarbs;
        double totalFat;
        int totalPreparationTime;
    }
}
