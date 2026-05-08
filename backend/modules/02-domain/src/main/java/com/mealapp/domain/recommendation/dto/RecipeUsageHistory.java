package com.mealapp.domain.recommendation.dto;

import lombok.Value;
import java.time.LocalDateTime;

/**
 * Bir tarifin geçmişte ne zaman kullanıldığını (tüketim veya öneri) tutan DTO.
 */
@Value
public class RecipeUsageHistory {
    Long recipeId;
    LocalDateTime usageTime;
    UsageType type;

    public enum UsageType {
        CONSUMPTION,
        RECOMMENDATION
    }
}
