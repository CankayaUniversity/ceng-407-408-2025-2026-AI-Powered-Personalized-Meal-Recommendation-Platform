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
        request.setIngredientId(3L);
        request.setInventoryGroupId(5L);
        request.setPortionLabel("1 piece");
        request.setPortionGrams(120.0);

        assertEquals("user-1", request.getUserId());
        assertEquals("Apple", request.getFoodName());
        assertEquals(DailyConsumption.MealType.SNACK, request.getMealType());
        assertEquals(DailyConsumption.PortionSize.SMALL, request.getPortionSize());
        assertTrue(request.getIsCustomEntry());
        assertEquals(3L, request.getIngredientId());
        assertEquals(5L, request.getInventoryGroupId());
        assertEquals("1 piece", request.getPortionLabel());
        assertEquals(120.0, request.getPortionGrams());
        
        ConsumptionRequest request2 = new ConsumptionRequest();
        request2.setUserId("user-1");
        request2.setFoodName("Apple");
        request2.setMealType(DailyConsumption.MealType.SNACK);
        request2.setPortionSize(DailyConsumption.PortionSize.SMALL);
        request2.setIsCustomEntry(true);
        request2.setIngredientId(3L);
        request2.setInventoryGroupId(5L);
        request2.setPortionLabel("1 piece");
        request2.setPortionGrams(120.0);
        
        assertEquals(request, request2);
        assertEquals(request.hashCode(), request2.hashCode());
        assertNotNull(request.toString());
    }
}
