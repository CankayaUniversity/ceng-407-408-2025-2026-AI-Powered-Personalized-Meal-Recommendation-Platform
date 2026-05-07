package com.mealapp.domain.recommendation.strategy;

import com.mealapp.domain.recommendation.entity.Recommendation;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.inventory.entity.Inventory;
import com.mealapp.domain.consumption.service.DailyConsumptionService;
import java.util.List;

public interface RecommendationStrategy {
    Recommendation recommend(User user, List<Inventory> currentInventory, DailyConsumptionService.DailyNutritionSummary dailySummary, String cravings, String aiModel);
}
