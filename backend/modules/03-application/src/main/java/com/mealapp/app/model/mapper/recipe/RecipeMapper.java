package com.mealapp.app.model.mapper.recipe;

import com.mealapp.app.model.dto.recipe.RecipeResponse;
import com.mealapp.domain.recipe.entity.Recipe;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class RecipeMapper {

    public RecipeResponse toResponse(Recipe recipe) {
        if (recipe == null) return null;
        
        return RecipeResponse.builder()
                .id(recipe.getId())
                .title(recipe.getTitle())
                .category("Genel") // Recipe entity'sinde henüz kategori yok, varsayılan değer veriyoruz
                .calories(recipe.getTotalCalories())
                .protein(recipe.getTotalProtein())
                .carbs(recipe.getTotalCarbs())
                .fat(recipe.getTotalFat())
                .preparationTime(recipe.getPreparationTimeMinutes())
                .servings(recipe.getServings())
                .rating(recipe.getAverageRating())
                .imageUrl(recipe.getImageUrl())
                .build();
    }

    public List<RecipeResponse> toResponseList(List<Recipe> recipes) {
        if (recipes == null) return List.of();
        return recipes.stream()
                .map(this::toResponse)
                .toList();
    }
}
