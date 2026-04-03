package com.mealapp.app.model.dto.recipe;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecipeResponse {
    private Long id;
    private String title;
    private String category;
    private Double calories;
    private Double protein;
    private Double carbs;
    private Double fat;
    private Integer preparationTime;
    private Integer servings;
    private Double rating;
    private String imageUrl;
    private String instructions;
    private List<RecipeIngredientDTO> ingredients;
}
