package com.mealapp.app.model.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class RecipeRatingResponse {
    private Long id;
    private Long userId;
    private Long recipeId;
    private String recipeTitle;
    private Integer rating;
    private String comment;
    private LocalDateTime createdAt;
}
