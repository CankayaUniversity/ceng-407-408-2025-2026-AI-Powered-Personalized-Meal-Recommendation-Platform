package com.mealapp.app.model.dto.recipe;

import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.entity.RecipeStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecipeRequest {
    private String title;
    private String category;
    private String instructions;
    private Integer preparationTime;
    private Integer preparationTimeMinutes; // Frontend compatibility
    private Integer servings;
    private Recipe.Difficulty difficulty;
    private List<RecipeIngredientRequest> ingredients;
    private RecipeStatus status;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecipeIngredientRequest {
        private Long ingredientId;
        private String ingredientName;
        private Double amount;
        private String unit;
        private Double grams;
    }
}
