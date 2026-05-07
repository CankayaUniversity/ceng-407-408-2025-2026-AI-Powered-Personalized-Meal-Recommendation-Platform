package com.mealapp.app.model.mapper;

import com.mealapp.app.model.dto.RecipeRatingResponse;
import com.mealapp.domain.recipe.entity.RecipeRating;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class RecipeRatingMapper {

    public RecipeRatingResponse toResponse(RecipeRating rating) {
        if (rating == null) return null;
        
        RecipeRatingResponse.RecipeRatingResponseBuilder builder = RecipeRatingResponse.builder()
                .id(rating.getId())
                .rating(rating.getRating())
                .comment(rating.getComment())
                .createdAt(rating.getCreatedAt());

        if (rating.getUser() != null) {
            builder.userId(rating.getUser().getId());
        }

        if (rating.getRecipe() != null) {
            builder.recipeId(rating.getRecipe().getId());
            builder.recipeTitle(rating.getRecipe().getTitle());
        }

        return builder.build();
    }

    public List<RecipeRatingResponse> toResponseList(List<RecipeRating> ratings) {
        return ratings.stream()
                .map(this::toResponse)
                .toList();
    }
}
