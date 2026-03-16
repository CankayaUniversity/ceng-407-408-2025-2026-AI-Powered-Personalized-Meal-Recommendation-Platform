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
        response.setEstimatedCalories(250);
        response.setConsumedAt(now);

        assertEquals(1L, response.getId());
        assertEquals(250, response.getEstimatedCalories());
        assertEquals(now, response.getConsumedAt());
        
        ConsumptionResponse response2 = new ConsumptionResponse();
        response2.setId(1L);
        response2.setEstimatedCalories(250);
        response2.setConsumedAt(now);
        
        assertEquals(response, response2);
        assertEquals(response.hashCode(), response2.hashCode());
        assertNotNull(response.toString());
    }
}
