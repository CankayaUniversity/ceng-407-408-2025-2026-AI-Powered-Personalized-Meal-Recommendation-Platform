package com.mealapp.app.model.dto;

import lombok.Data;

@Data
public class RecipeRatingRequest {
    private String userId;
    private Long recipeId;
    private Integer rating;
    private String comment;
}
