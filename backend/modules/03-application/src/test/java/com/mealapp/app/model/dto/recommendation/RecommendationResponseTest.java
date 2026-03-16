package com.mealapp.app.model.dto.recommendation;

import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class RecommendationResponseTest {
    @Test
    void testRecommendationResponseLombok() {
        RecommendationResponse response = new RecommendationResponse();
        response.setRecommendedRecipes(List.of("Pasta", "Salad"));
        response.setAiInsight("You should eat healthy!");

        assertEquals(2, response.getRecommendedRecipes().size());
        assertEquals("You should eat healthy!", response.getAiInsight());
        
        RecommendationResponse response2 = new RecommendationResponse();
        response2.setRecommendedRecipes(List.of("Pasta", "Salad"));
        response2.setAiInsight("You should eat healthy!");
        
        assertEquals(response, response2);
        assertEquals(response.hashCode(), response2.hashCode());
        assertNotNull(response.toString());
    }
}
