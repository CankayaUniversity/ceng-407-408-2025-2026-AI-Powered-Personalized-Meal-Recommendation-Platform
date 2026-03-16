package com.mealapp.app.model.dto.consumption;

import com.mealapp.domain.consumption.entity.DailyConsumption;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ConsumptionRequestTest {
    @Test
    void testConsumptionRequestLombok() {
        ConsumptionRequest request = new ConsumptionRequest();
        request.setUserId("user-1");
        request.setFoodName("Apple");
        request.setMealType(DailyConsumption.MealType.SNACK);
        request.setPortionSize(DailyConsumption.PortionSize.SMALL);
        request.setIsCustomEntry(true);

        assertEquals("user-1", request.getUserId());
        assertEquals("Apple", request.getFoodName());
        assertEquals(DailyConsumption.MealType.SNACK, request.getMealType());
        assertEquals(DailyConsumption.PortionSize.SMALL, request.getPortionSize());
        assertTrue(request.getIsCustomEntry());
        
        ConsumptionRequest request2 = new ConsumptionRequest();
        request2.setUserId("user-1");
        request2.setFoodName("Apple");
        request2.setMealType(DailyConsumption.MealType.SNACK);
        request2.setPortionSize(DailyConsumption.PortionSize.SMALL);
        request2.setIsCustomEntry(true);
        
        assertEquals(request, request2);
        assertEquals(request.hashCode(), request2.hashCode());
        assertNotNull(request.toString());
    }
}
