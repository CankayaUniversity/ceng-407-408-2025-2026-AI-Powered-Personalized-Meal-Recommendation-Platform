package com.mealapp.app.model.dto.consumption;

import lombok.Data;

import java.time.LocalDate;

/**
 * Kullanıcının belirli bir gün için toplu beslenme özetini taşır.
 */
@Data
public class ConsumptionSummaryResponse {
    private LocalDate date;
    private Integer totalCalories;
    private Double totalProtein;
    private Double totalCarbs;
    private Double totalFat;
}
