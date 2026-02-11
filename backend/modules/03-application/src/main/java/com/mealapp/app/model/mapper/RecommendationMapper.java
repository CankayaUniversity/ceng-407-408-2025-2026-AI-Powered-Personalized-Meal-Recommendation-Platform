package com.mealapp.app.model.mapper;

import com.mealapp.app.model.dto.RecommendationResponse;
import com.mealapp.domain.recipe.entity.Recipe;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

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
        
        List<String> titles = recipes.stream()
                .map(Recipe::getTitle)
                .collect(Collectors.toList());
        
        response.setRecommendedRecipes(titles);
        response.setAiInsight("AI önerileri başarıyla oluşturuldu.");
        
        return response;
    }
}
