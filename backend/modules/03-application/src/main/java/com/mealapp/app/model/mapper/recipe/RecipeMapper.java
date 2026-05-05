package com.mealapp.app.model.mapper.recipe;
import com.mealapp.app.model.dto.recipe.RecipeIngredientDTO;
import com.mealapp.app.model.dto.recipe.RecipeResponse;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.entity.RecipeRating;
import com.mealapp.domain.recipe.repository.RecipeFavoriteRepository;
import com.mealapp.domain.recipe.repository.RecipeRatingRepository;
import com.mealapp.domain.recipe.service.UnitConverterService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class RecipeMapper {

    private final UnitConverterService unitConverterService;
    private final RecipeRatingRepository recipeRatingRepository;
    private final RecipeFavoriteRepository recipeFavoriteRepository;

    public RecipeResponse toResponse(Recipe recipe) {
        return toResponse(recipe, null);
    }

    public RecipeResponse toResponse(Recipe recipe, String currentUserId) {
        if (recipe == null) return null;

        Integer userRating = null;
        boolean isFavorite = false;
        if (currentUserId != null && recipe.getId() != null) {
            userRating = recipeRatingRepository.findByUserIdAndRecipeId(currentUserId, recipe.getId())
                    .stream()
                    .findFirst()
                    .map(RecipeRating::getRating)
                    .orElse(null);
            
            isFavorite = recipeFavoriteRepository.existsByUserIdAndRecipeId(currentUserId, recipe.getId());
        } else if (recipe.getId() != null) {
            // Eğer userId yoksa ama favorite verisi mappleme içine sızmışsa logla veya varsayılan false yap
        }

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
            .ratingCount(recipe.getRatingCount())
            .userRating(userRating)
            .imageUrl(recipe.getImageUrl())
            .instructions(recipe.getInstructions())
            .difficulty(recipe.getDifficulty() != null ? recipe.getDifficulty().name() : null)
            .status(recipe.getStatus() != null ? recipe.getStatus().name() : null)
            .createdBy(recipe.getCreatedBy())
            .parentId(recipe.getParentId())
            .ingredients(mapIngredients(recipe))
            .isFavorite(isFavorite)
            .build();
    }

    public List<RecipeResponse> toResponseList(List<Recipe> recipes) {
        return toResponseList(recipes, null);
    }

    public List<RecipeResponse> toResponseList(List<Recipe> recipes, String currentUserId) {
        if (recipes == null) return List.of();
        return recipes.stream()
            .map(r -> toResponse(r, currentUserId))
            .toList();
    }

    private List<RecipeIngredientDTO> mapIngredients(Recipe recipe) {
        if (recipe.getRecipeIngredients() == null) {
            return List.of();
        }

        try {
            return recipe.getRecipeIngredients().stream()
                .filter(ri -> ri != null && ri.getIngredient() != null)
                .map(ri -> {
                    // Önemli: Service zaten grams'ı hesaplamış olmalı.
                    // Ama garantiye almak için 0 kontrolü yapıyoruz.
                    Double gramsValue = (ri.getGrams() != null) ? ri.getGrams() : 0.0;

                    var builder = RecipeIngredientDTO.builder()
                        .name(ri.getIngredient().getName())
                        .amount(ri.getAmount())
                        .unit(ri.getUnit())
                        .grams(gramsValue)
                        .unitGramWeight(unitConverterService.getUnitGramWeight(ri.getUnit(), ri.getIngredient()));

                    if (ri.getIngredient().getNutrition() != null) {
                        var n = ri.getIngredient().getNutrition();
                        double factor = gramsValue / 100.0;
                        builder.calories(n.getCaloriesPer100g() * factor)
                            .protein(n.getProteinPer100g() * factor)
                            .carbs(n.getCarbsPer100g() * factor)
                            .fat(n.getFatPer100g() * factor);
                    }

                    return builder.build();
                })
                .collect(Collectors.toList());
        } catch (Exception e) {
            return List.of();
        }
    }
}