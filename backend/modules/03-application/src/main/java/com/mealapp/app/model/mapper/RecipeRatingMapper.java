package com.mealapp.app.model.mapper;

import com.mealapp.app.model.dto.RecipeRatingResponse;
import com.mealapp.domain.recipe.entity.RecipeRating;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class RecipeRatingMapper {

    public RecipeRatingResponse toResponse(RecipeRating rating) {
        return RecipeRatingResponse.builder()
                .id(rating.getId())
                .userId(rating.getUser().getId())
                .recipeId(rating.getRecipe().getId())
                .recipeTitle(rating.getRecipe().getTitle())
                .rating(rating.getRating())
                .comment(rating.getComment())
                .createdAt(rating.getCreatedAt())
                .build();
    }

    public List<RecipeRatingResponse> toResponseList(List<RecipeRating> ratings) {
        return ratings.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }
}
