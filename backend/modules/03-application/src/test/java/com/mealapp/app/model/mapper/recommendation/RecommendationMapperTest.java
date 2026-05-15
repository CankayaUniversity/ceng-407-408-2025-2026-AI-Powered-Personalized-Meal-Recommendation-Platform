package com.mealapp.app.model.mapper.recommendation;

import com.mealapp.app.model.dto.recommendation.RecommendationResponse;
import com.mealapp.domain.recommendation.entity.Recommendation;
import com.mealapp.domain.recommendation.entity.RecommendedRecipe;
import com.mealapp.domain.recipe.entity.Recipe;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class RecommendationMapperTest {

    @Test
    void toResponse_mapsRecipeTitlesAndInsight() {
        // Arrange
        Recipe r1 = Recipe.builder().id(1L).title("Menemen").totalCalories(700.0).servings(2).build();
        Recipe r2 = Recipe.builder().id(2L).title("Mercimek Çorbası").build();

        Recommendation recommendation = Recommendation.builder()
                .id(100L)
                .isAiGenerated(true)
                .build();

        recommendation.addRecommendedRecipe(RecommendedRecipe.builder().id(1L).recipe(r1).aiInsight("Harika bir seçim").build());
        recommendation.addRecommendedRecipe(RecommendedRecipe.builder().id(2L).recipe(r2).build());

        RecommendationMapper mapper = new RecommendationMapper();

        // Act
        RecommendationResponse response = mapper.toResponse(recommendation, List.of("Yumurta"));

        // Assert
        assertNotNull(response);
        assertEquals(2, response.getRecommendedRecipes().size());
        assertEquals(1L, response.getRecommendedRecipes().get(0).getRecipeId());
        assertEquals("Menemen", response.getRecommendedRecipes().get(0).getRecipeTitle());
        assertEquals("Harika bir seçim", response.getRecommendedRecipes().get(0).getInsight());
        assertEquals(350.0, response.getRecommendedRecipes().get(0).getKcalPerServing());
        assertEquals("Mercimek Çorbası", response.getRecommendedRecipes().get(1).getRecipeTitle());
        assertTrue(response.isAiGenerated());
    }

    @Test
    void toResponse_defaultsServingDivisorToOneForInvalidServings() {
        Recipe recipe = Recipe.builder()
                .id(1L)
                .title("Single Safe Serving")
                .totalCalories(420.0)
                .servings(0)
                .build();
        Recommendation recommendation = Recommendation.builder().build();
        recommendation.addRecommendedRecipe(RecommendedRecipe.builder().id(1L).recipe(recipe).build());

        RecommendationMapper mapper = new RecommendationMapper();

        RecommendationResponse response = mapper.toResponse(recommendation, List.of());

        assertEquals(420.0, response.getRecommendedRecipes().get(0).getKcalPerServing());
    }

    @Test
    void toResponse_handlesEmptyList() {
        RecommendationMapper mapper = new RecommendationMapper();
        Recommendation recommendation = new Recommendation();

        RecommendationResponse response = mapper.toResponse(recommendation, List.of());

        assertNotNull(response);
        assertNotNull(response.getRecommendedRecipes());
        assertTrue(response.getRecommendedRecipes().isEmpty());
    }
}
