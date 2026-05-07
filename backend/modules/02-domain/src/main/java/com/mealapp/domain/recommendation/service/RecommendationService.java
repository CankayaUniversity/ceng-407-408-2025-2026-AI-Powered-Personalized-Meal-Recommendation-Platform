package com.mealapp.domain.recommendation.service;

import com.mealapp.domain.consumption.service.DailyConsumptionService;
import com.mealapp.domain.inventory.entity.Inventory;
import com.mealapp.domain.recommendation.entity.Recommendation;
import com.mealapp.domain.recommendation.repository.RecommendationRepository;
import com.mealapp.domain.recipe.service.RecipeService;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.recommendation.strategy.RecommendationStrategy;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final RecommendationRepository recommendationRepository;

    /**
     * Kullanıcı ve envanter bilgilerine dayanarak yemek tarifleri önerir.
     * Öneriler veritabanına kaydedilir.
     */
    @Transactional
    public Recommendation getRecommendations(User user, List<Inventory> inventory, String cravings, String aiModel) {
        DailyConsumptionService.DailyNutritionSummary dailySummary = dailyConsumptionService.getDailyNutritionSummary(user.getId(), java.time.LocalDate.now());

        Recommendation recommendation = aiRecommendationStrategy.recommend(user, inventory, dailySummary, cravings, aiModel);

        // Önerilen her tarif için besin değerlerini güncelleyelim.
        recommendation.getRecommendedRecipes().forEach(rr -> recipeService.calculateAndSetNutrition(rr.getRecipe()));

        return recommendationRepository.save(recommendation);
    }

    /**
     * Kullanıcının geçmiş önerilerini getirir.
     */
    @Transactional(readOnly = true)
    public List<Recommendation> getRecommendationHistory(String userId) {
        return recommendationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }
}
