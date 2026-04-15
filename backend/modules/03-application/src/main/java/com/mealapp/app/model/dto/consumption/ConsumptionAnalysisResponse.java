package com.mealapp.app.model.dto.consumption;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDate;
import java.util.List;

/**
 * Kullanıcının belirli bir zaman aralığındaki beslenme analizini taşır.
 * Haftalık, aylık özetler ve hedeften sapma analizleri için kullanılır.
 */
@Data
@Builder
public class ConsumptionAnalysisResponse {
    private LocalDate startDate;
    private LocalDate endDate;
    private String period; // WEEKLY, MONTHLY, CUSTOM

    private Summary totals;
    private Summary averages;
    private List<DailyDetail> dailyDetails;

    @Data
    @Builder
    public static class Summary {
        private Integer calories;
        private Double protein;
        private Double carbs;
        private Double fat;
    }

    @Data
    @Builder
    public static class DailyDetail {
        private LocalDate date;
        private Integer consumedCalories;
        private Integer targetCalories;
        private Integer deviation; // Pozitif veya negatif sapma
        private Double protein;
        private Double carbs;
        private Double fat;
    }
}
