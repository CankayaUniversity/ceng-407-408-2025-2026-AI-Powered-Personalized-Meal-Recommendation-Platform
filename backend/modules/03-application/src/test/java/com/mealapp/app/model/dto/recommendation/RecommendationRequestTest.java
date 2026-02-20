package com.mealapp.app.model.dto.recommendation;

import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class RecommendationRequestTest {
    @Test
    void testRecommendationRequestLombok() {
        RecommendationRequest request = new RecommendationRequest();
        request.setUserId(1L);
        request.setAvailableIngredients(List.of("Tomato", "Onion"));

        assertEquals(1L, request.getUserId());
        assertEquals(2, request.getAvailableIngredients().size());
        assertTrue(request.getAvailableIngredients().contains("Tomato"));
        
        RecommendationRequest request2 = new RecommendationRequest();
        request2.setUserId(1L);
        request2.setAvailableIngredients(List.of("Tomato", "Onion"));
        
        assertEquals(request, request2);
        assertEquals(request.hashCode(), request2.hashCode());
        assertNotNull(request.toString());
    }
}
