package com.mealapp.domain.recommendation.service;

import com.mealapp.domain.consumption.service.DailyConsumptionService;
import com.mealapp.domain.inventory.entity.Inventory;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.service.RecipeService;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.recommendation.strategy.RecommendationStrategy;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import java.util.List;

/**
 * Bu servis, tüm öneri sürecini koordine eder.
 */
@Service
@RequiredArgsConstructor
public class RecommendationService {

    private final RecipeService recipeService;
    private final DailyConsumptionService dailyConsumptionService;
    private final RecommendationStrategy aiRecommendationStrategy;

    /**
     * Kullanıcı ve envanter bilgilerine dayanarak yemek tarifleri önerir.
     * Sonuçlar kullanıcı ID'si ve envanterdeki malzeme listesine göre önbelleğe alınır.
     */
    @Cacheable(value = "recommendations", key = "#user.id + #inventory.hashCode()")
    public List<Recipe> getRecommendations(User user, List<Inventory> inventory) {
        DailyConsumptionService.DailyNutritionSummary dailySummary = dailyConsumptionService.getDailyNutritionSummary(user.getId(), java.time.LocalDate.now());
        
        List<Recipe> recipes = aiRecommendationStrategy.recommend(user, inventory, dailySummary);
        
        // Önerilen her tarif için besin değerlerini (Transient olsa bile) 
        // güncelleyelim ki prompt veya response'da doğru görünsün.
        recipes.forEach(recipeService::calculateAndSetNutrition);
        
        return recipes;
    }
}
