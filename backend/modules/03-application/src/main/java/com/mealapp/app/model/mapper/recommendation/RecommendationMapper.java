package com.mealapp.app.model.mapper.recommendation;

import com.mealapp.app.model.dto.recommendation.RecommendationResponse;
import com.mealapp.domain.recipe.entity.Recipe;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Domain Entity nesneleri ile API DTO nesneleri arasındaki dönüşümleri yönetir.
 * Bu sayede Domain katmanındaki değişiklikler API katmanını doğrudan etkilemez.
 */
@Component
public class RecommendationMapper {

    /**
     * Domain'den gelen Recipe listesini, dış dünyaya dönülecek olan DTO formatına çevirir.
     */
    public RecommendationResponse toResponse(List<Recipe> recipes) {
        RecommendationResponse response = new RecommendationResponse();
        
        List<RecommendationResponse.RecipeRecommendationDto> dtos = recipes.stream()
                .map(recipe -> {
                    RecommendationResponse.RecipeRecommendationDto dto = new RecommendationResponse.RecipeRecommendationDto();
                    dto.setRecipeTitle(recipe.getTitle());
                    dto.setInsight(recipe.getAiInsight() != null ? recipe.getAiInsight() : "Diyetinize ve envanterinize uygun bir seçenek.");
                    return dto;
                })
                .toList();
        
        response.setRecommendedRecipes(dtos);
        
        return response;
    }
}
