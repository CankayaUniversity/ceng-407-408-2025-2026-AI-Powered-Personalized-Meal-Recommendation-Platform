package com.mealapp.app.model.dto.recommendation;

import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class RecommendationResponseTest {
    @Test
    void testRecommendationResponseLombok() {
        RecommendationResponse response = new RecommendationResponse();
        RecommendationResponse.RecipeRecommendationDto dto1 = new RecommendationResponse.RecipeRecommendationDto();
        dto1.setRecipeTitle("Pasta");
        dto1.setInsight("Insight 1");
        
        RecommendationResponse.RecipeRecommendationDto dto2 = new RecommendationResponse.RecipeRecommendationDto();
        dto2.setRecipeTitle("Salad");
        dto2.setInsight("Insight 2");

        response.setRecommendedRecipes(List.of(dto1, dto2));

        assertEquals(2, response.getRecommendedRecipes().size());
        assertEquals("Pasta", response.getRecommendedRecipes().get(0).getRecipeTitle());
        
        RecommendationResponse response2 = new RecommendationResponse();
        response2.setRecommendedRecipes(List.of(dto1, dto2));
        
        assertEquals(response, response2);
        assertEquals(response.hashCode(), response2.hashCode());
        assertNotNull(response.toString());
    }
}
