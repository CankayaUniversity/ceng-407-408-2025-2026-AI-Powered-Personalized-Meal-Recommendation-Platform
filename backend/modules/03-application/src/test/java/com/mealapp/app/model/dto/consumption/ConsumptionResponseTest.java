package com.mealapp.app.model.dto.consumption;

import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;
import static org.junit.jupiter.api.Assertions.*;

class ConsumptionResponseTest {
    @Test
    void testConsumptionResponseLombok() {
        LocalDateTime now = LocalDateTime.now();
        ConsumptionResponse response = new ConsumptionResponse();
        response.setId(1L);
        response.setFoodName("Soup");
        response.setRecipeId(2L);
        response.setInventoryGroupId(3L);
        response.setPortionLabel("1 bowl");
        response.setEstimatedCalories(250);
        response.setEstimatedProtein(15.2);
        response.setEstimatedCarbs(18.3);
        response.setEstimatedFat(9.4);
        response.setIsFromInventory(true);
        response.setConsumedAt(now);

        assertEquals(1L, response.getId());
        assertEquals("Soup", response.getFoodName());
        assertEquals(2L, response.getRecipeId());
        assertEquals(3L, response.getInventoryGroupId());
        assertEquals("1 bowl", response.getPortionLabel());
        assertEquals(250, response.getEstimatedCalories());
        assertEquals(15.2, response.getEstimatedProtein());
        assertEquals(18.3, response.getEstimatedCarbs());
        assertEquals(9.4, response.getEstimatedFat());
        assertTrue(response.getIsFromInventory());
        assertEquals(now, response.getConsumedAt());
        
        ConsumptionResponse response2 = new ConsumptionResponse();
        response2.setId(1L);
        response2.setFoodName("Soup");
        response2.setRecipeId(2L);
        response2.setInventoryGroupId(3L);
        response2.setPortionLabel("1 bowl");
        response2.setEstimatedCalories(250);
        response2.setEstimatedProtein(15.2);
        response2.setEstimatedCarbs(18.3);
        response2.setEstimatedFat(9.4);
        response2.setIsFromInventory(true);
        response2.setConsumedAt(now);
        
        assertEquals(response, response2);
        assertEquals(response.hashCode(), response2.hashCode());
        assertNotNull(response.toString());
    }
}
