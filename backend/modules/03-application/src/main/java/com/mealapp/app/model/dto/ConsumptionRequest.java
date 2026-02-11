package com.mealapp.app.model.dto;

import com.mealapp.domain.consumption.entity.DailyConsumption;
import lombok.Data;

/**
 * Günlük tüketim kaydı oluştururken kullanılan istek nesnesi.
 */
@Data
public class ConsumptionRequest {
    private Long userId;
    private String foodName;
    private DailyConsumption.MealType mealType;
    private DailyConsumption.PortionSize portionSize;
    
    /**
     * Eğer dışarıda yenilen bir yemekse true. AI tahmini tetiklenecek.
     */
    private Boolean isCustomEntry;
}
