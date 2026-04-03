package com.mealapp.app.model.dto.consumption;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * Günlük tüketim kaydı oluşturulduktan sonra dönen temel yanıt nesnesi.
 */
@Data
public class ConsumptionResponse {
    private Long id;
    private String foodName;
    private Long recipeId;
    private Long ingredientId;
    private Long inventoryGroupId;
    private String portionLabel;
    private Integer estimatedCalories; // null olabilir; dışarıda yenildiyse AI tarafından sonra hesaplanacaktır
    private Double estimatedProtein;
    private Double estimatedCarbs;
    private Double estimatedFat;
    private Double portionGrams; // Hesaplanan gramaj bilgisi (UI için)
    private Double unitGramWeight; // Seçilen birimin gramaj katsayısı (UI için)
    private Boolean isFromInventory;
    private LocalDateTime consumedAt;
}
