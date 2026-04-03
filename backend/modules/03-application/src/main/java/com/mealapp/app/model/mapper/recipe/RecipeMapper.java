package com.mealapp.app.model.mapper.recipe;

import com.mealapp.app.model.dto.recipe.RecipeIngredientDTO;
import com.mealapp.app.model.dto.recipe.RecipeResponse;
import com.mealapp.domain.recipe.entity.Recipe;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class RecipeMapper {

    public RecipeResponse toResponse(Recipe recipe) {
        if (recipe == null) return null;

        return RecipeResponse.builder()
            .id(recipe.getId())
            .title(recipe.getTitle())
            .category("Genel")
            .calories(recipe.getTotalCalories())
            .protein(recipe.getTotalProtein())
            .carbs(recipe.getTotalCarbs())
            .fat(recipe.getTotalFat())
            .preparationTime(recipe.getPreparationTimeMinutes())
            .servings(recipe.getServings())
            .rating(recipe.getAverageRating())
            .imageUrl(recipe.getImageUrl())
            // Yeni Alanlar
            .instructions(recipe.getInstructions())
            .ingredients(mapIngredients(recipe))
            .build();
    }

    public List<RecipeResponse> toResponseList(List<Recipe> recipes) {
        if (recipes == null) return List.of();
        return recipes.stream()
            .map(this::toResponse)
            .toList();
    }

    private List<RecipeIngredientDTO> mapIngredients(Recipe recipe) {
        // İlişkili listenin yüklenip yüklenmediğini kontrol et (Lazy Safe)
        if (recipe.getRecipeIngredients() == null) {
            return List.of();
        }

        try {
            return recipe.getRecipeIngredients().stream()
                .filter(ri -> ri != null && ri.getIngredient() != null)
                .map(ri -> RecipeIngredientDTO.builder()
                    .name(ri.getIngredient().getName()) // Burası patlıyordu
                    .amount(ri.getGrams() != null ? ri.getGrams() : 0.0)
                    .unit("g")
                    .build())
                .collect(Collectors.toList());
        } catch (Exception e) {
            // Eğer hala Lazy Load hatası alırsak, listeyi bozmak yerine boş dönüyoruz
            return List.of();
        }
    }
}