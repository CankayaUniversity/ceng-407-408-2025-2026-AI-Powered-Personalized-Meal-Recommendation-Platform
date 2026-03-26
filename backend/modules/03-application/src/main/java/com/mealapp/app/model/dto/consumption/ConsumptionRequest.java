package com.mealapp.app.model.dto.consumption;

import com.mealapp.domain.consumption.entity.DailyConsumption;
import lombok.Data;

/**
 * Günlük tüketim kaydı oluştururken kullanılan istek nesnesi.
 */
@Data
public class ConsumptionRequest {
    private String userId;
    private String foodName;
    private DailyConsumption.MealType mealType;
    private DailyConsumption.PortionSize portionSize;
    
    /**
     * Eğer dışarıda yenilen bir yemekse true. AI tahmini tetiklenecek.
     */
    private Boolean isCustomEntry;

    /**
     * Eğer evdeki malzemelerle yapıldıysa true. Stok düşülecek.
     */
    private Boolean isFromInventory;

    /**
     * Sistemdeki bir tarif tüketilirse ID'si gönderilir.
     */
    private Long recipeId;
}
