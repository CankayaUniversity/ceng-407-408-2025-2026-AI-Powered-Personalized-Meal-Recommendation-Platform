package com.mealapp.app.model.mapper.recommendation;

import com.mealapp.app.model.dto.recommendation.RecommendationResponse;
import com.mealapp.domain.recommendation.entity.Recommendation;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.entity.RecipeIngredient;
import com.mealapp.domain.recipe.service.RecipeNutritionCalculator;
import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Domain Entity nesneleri ile API DTO nesneleri arasındaki dönüşümleri yönetir.
 */
@Component
public class RecommendationMapper {

    /**
     * Domain'den gelen Recommendation nesnesini, dış dünyaya dönülecek olan DTO formatına çevirir.
     */
    public RecommendationResponse toResponse(Recommendation recommendation, List<String> inventoryIngredients) {
        RecommendationResponse response = new RecommendationResponse();
        response.setId(recommendation.getId());
        response.setCreatedAt(recommendation.getCreatedAt());
        response.setCravings(recommendation.getCravings());
        response.setAiGenerated(recommendation.isAiGenerated());

        Set<String> inventoryKeys = inventoryIngredients == null
                ? Set.of()
                : inventoryIngredients.stream()
                .map(this::normalizeKey)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));

        List<RecommendationResponse.RecipeRecommendationDto> dtos = recommendation.getRecommendedRecipes().stream()
                .map(rr -> {
                    Recipe recipe = rr.getRecipe();
                    RecommendationResponse.RecipeRecommendationDto dto = new RecommendationResponse.RecipeRecommendationDto();
                    dto.setRecommendationRecipeId(rr.getId());
                    dto.setRecipeId(recipe.getId());
                    dto.setRecipeTitle(recipe.getTitle());
                    dto.setInsight(rr.getAiInsight() != null ? rr.getAiInsight() : "Diyetinize ve envanterinize uygun bir seçenek.");
                    dto.setUserRating(rr.getUserRating());
                    dto.setUserComment(rr.getUserComment());
                    dto.setMatchedIngredients(getIngredientNames(recipe).stream()
                            .filter(name -> inventoryKeys.contains(normalizeKey(name)))
                            .toList());
                    dto.setMissingIngredients(getIngredientNames(recipe).stream()
                            .filter(name -> !inventoryKeys.contains(normalizeKey(name)))
                            .toList());
                    dto.setCalories(recipe.getTotalCalories());
                    dto.setKcalPerServing(RecipeNutritionCalculator.kcalPerServing(recipe));
                    dto.setProtein(recipe.getTotalProtein());
                    dto.setCarbs(recipe.getTotalCarbs());
                    dto.setFat(recipe.getTotalFat());
                    dto.setPreparationTimeMinutes(recipe.getPreparationTimeMinutes());
                    dto.setServings(recipe.getServings());
                    dto.setAverageRating(recipe.getAverageRating());
                    dto.setRatingCount(recipe.getRatingCount());
                    dto.setImageUrl(recipe.getImageUrl());
                    dto.setCooked(rr.isCooked());
                    dto.setTotalCookCount(recipe.getTotalCookCount());
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
