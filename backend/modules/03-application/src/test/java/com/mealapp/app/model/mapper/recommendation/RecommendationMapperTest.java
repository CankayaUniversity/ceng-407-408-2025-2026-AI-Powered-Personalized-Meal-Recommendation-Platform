package com.mealapp.app.model.mapper.recommendation;

import com.mealapp.app.model.dto.recommendation.RecommendationResponse;
import com.mealapp.domain.recipe.entity.Recipe;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class RecommendationMapperTest {

    @Test
    void toResponse_mapsRecipeTitlesAndInsight() {
        // Arrange
        Recipe r1 = Recipe.builder().id(1L).title("Menemen").build();
        Recipe r2 = Recipe.builder().id(2L).title("Mercimek Çorbası").build();
        List<Recipe> recipes = List.of(r1, r2);

        RecommendationMapper mapper = new RecommendationMapper();

        // Act
        RecommendationResponse response = mapper.toResponse(recipes, List.of("Menemen"));

        // Assert
        assertNotNull(response);
        assertEquals(2, response.getRecommendedRecipes().size());
        assertEquals(1L, response.getRecommendedRecipes().get(0).getRecipeId());
        assertEquals("Menemen", response.getRecommendedRecipes().get(0).getRecipeTitle());
        assertEquals("Mercimek Çorbası", response.getRecommendedRecipes().get(1).getRecipeTitle());
    }

    @Test
    void toResponse_handlesEmptyList() {
        RecommendationMapper mapper = new RecommendationMapper();

        RecommendationResponse response = mapper.toResponse(List.of(), List.of());

        assertNotNull(response);
        assertNotNull(response.getRecommendedRecipes());
        assertTrue(response.getRecommendedRecipes().isEmpty());
    }
}
