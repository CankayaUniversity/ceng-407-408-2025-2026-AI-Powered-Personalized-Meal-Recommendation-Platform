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
        RecommendationResponse response = mapper.toResponse(recipes);

        // Assert
        assertNotNull(response);
        assertEquals(List.of("Menemen", "Mercimek Çorbası"), response.getRecommendedRecipes());
        assertEquals("AI önerileri başarıyla oluşturuldu.", response.getAiInsight());
    }

    @Test
    void toResponse_handlesEmptyList() {
        RecommendationMapper mapper = new RecommendationMapper();

        RecommendationResponse response = mapper.toResponse(List.of());

        assertNotNull(response);
        assertNotNull(response.getRecommendedRecipes());
        assertTrue(response.getRecommendedRecipes().isEmpty());
        assertEquals("AI önerileri başarıyla oluşturuldu.", response.getAiInsight());
    }
}
