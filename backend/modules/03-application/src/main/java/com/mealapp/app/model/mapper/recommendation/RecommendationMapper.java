package com.mealapp.app.model.mapper.recommendation;

import com.mealapp.app.model.dto.recommendation.RecommendationResponse;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.entity.RecipeIngredient;
import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Domain Entity nesneleri ile API DTO nesneleri arasındaki dönüşümleri yönetir.
 * Bu sayede Domain katmanındaki değişiklikler API katmanını doğrudan etkilemez.
 */
@Component
public class RecommendationMapper {

    /**
     * Domain'den gelen Recipe listesini, dış dünyaya dönülecek olan DTO formatına çevirir.
     */
    public RecommendationResponse toResponse(List<Recipe> recipes, List<String> prioritizedIngredients) {
        RecommendationResponse response = new RecommendationResponse();

        Set<String> inventoryKeys = prioritizedIngredients == null
                ? Set.of()
                : prioritizedIngredients.stream()
                .map(this::normalizeKey)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));

        List<RecommendationResponse.RecipeRecommendationDto> dtos = recipes.stream()
                .map(recipe -> {
                    RecommendationResponse.RecipeRecommendationDto dto = new RecommendationResponse.RecipeRecommendationDto();
                    dto.setRecipeId(recipe.getId());
                    dto.setRecipeTitle(recipe.getTitle());
                    dto.setInsight(recipe.getAiInsight() != null ? recipe.getAiInsight() : "Diyetinize ve envanterinize uygun bir seçenek.");
                    dto.setMatchedIngredients(getIngredientNames(recipe).stream()
                            .filter(name -> inventoryKeys.contains(normalizeKey(name)))
                            .toList());
                    dto.setMissingIngredients(getIngredientNames(recipe).stream()
                            .filter(name -> !inventoryKeys.contains(normalizeKey(name)))
                            .toList());
                    dto.setCalories(recipe.getTotalCalories());
                    dto.setProtein(recipe.getTotalProtein());
                    dto.setCarbs(recipe.getTotalCarbs());
                    dto.setFat(recipe.getTotalFat());
                    dto.setPreparationTimeMinutes(recipe.getPreparationTimeMinutes());
                    dto.setServings(recipe.getServings());
                    dto.setAverageRating(recipe.getAverageRating());
                    dto.setImageUrl(recipe.getImageUrl());
                    return dto;
                })
                .toList();

        response.setRecommendedRecipes(dtos);

        return response;
    }

    private List<String> getIngredientNames(Recipe recipe) {
        if (recipe.getRecipeIngredients() == null || recipe.getRecipeIngredients().isEmpty()) {
            return List.of();
        }

        return recipe.getRecipeIngredients().stream()
                .map(RecipeIngredient::getIngredient)
                .filter(java.util.Objects::nonNull)
                .map(ingredient -> ingredient.getName() == null ? "" : ingredient.getName().trim())
                .filter(name -> !name.isBlank())
                .toList();
    }

    private String normalizeKey(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}
