package com.mealapp.app.model.dto.recipe;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.mealapp.domain.recipe.entity.RecipeCategory;

import com.mealapp.domain.user.entity.User;
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
    private RecipeCategory category;
    private User.DietType dietType;
    private Double calories;
    private Double kcalPerServing;
    private Double protein;
    private Double carbs;
    private Double fat;
    private Integer preparationTime;
    private Integer servings;
    private Double rating;
    private Integer ratingCount;
    private Integer userRating;
    private String imageUrl;
    private String instructions;
    private String status;
    private String difficulty;
    private String createdBy;
    private Long parentId;
    private Integer versionNumber;
    private java.time.LocalDateTime createdAt;
    private List<RecipeIngredientDTO> ingredients;
    @JsonProperty("isFavorite")
    private boolean isFavorite;
}
