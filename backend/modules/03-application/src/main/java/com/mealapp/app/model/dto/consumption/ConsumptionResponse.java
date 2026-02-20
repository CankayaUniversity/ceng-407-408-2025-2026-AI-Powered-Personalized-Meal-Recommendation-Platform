package com.mealapp.app.model.dto.consumption;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * Günlük tüketim kaydı oluşturulduktan sonra dönen temel yanıt nesnesi.
 */
@Data
public class ConsumptionResponse {
    private Long id;
    private Integer estimatedCalories; // null olabilir; dışarıda yenildiyse AI tarafından sonra hesaplanacaktır
    private LocalDateTime consumedAt;
}
