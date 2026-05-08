package com.mealapp.domain.recommendation.service;

import com.mealapp.domain.consumption.service.DailyConsumptionService;
import com.mealapp.domain.inventory.entity.Inventory;
import com.mealapp.domain.recommendation.entity.Recommendation;
import com.mealapp.domain.recommendation.repository.RecommendationRepository;
import com.mealapp.domain.recipe.service.RecipeService;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.recommendation.entity.RecommendedRecipe;
import com.mealapp.domain.recommendation.repository.RecommendationRepository;
import com.mealapp.domain.recommendation.strategy.RecommendationStrategy;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mealapp.domain.recommendation.dto.RecipeUsageHistory;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

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
    public Recommendation getRecommendations(User user, List<Inventory> inventory, String cravings, String aiModel, String apiKey) {
        DailyConsumptionService.DailyNutritionSummary dailySummary = dailyConsumptionService.getDailyNutritionSummary(user.getId(), LocalDate.now());

        // 1. Son önerilen tarifleri alalım (son 3 öneri seansı) ve sadece pişirilmiş olanları filtreleyelim
        List<RecipeUsageHistory> recommendationHistory = recommendationRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), PageRequest.of(0, 3))
                .stream()
                .flatMap(r -> r.getRecommendedRecipes().stream()
                        .filter(RecommendedRecipe::isCooked) // Sadece kullanıcının "bu tarifi yaptım" dediklerini çeşitlilik puanlamasına dahil ediyoruz
                        .map(rr -> new RecipeUsageHistory(rr.getRecipe().getId(), r.getCreatedAt(), RecipeUsageHistory.UsageType.RECOMMENDATION)))
                .collect(Collectors.toList());

        // 2. Son 7 günün tüketimlerini alalım
        List<RecipeUsageHistory> consumptionHistory = dailyConsumptionService.getConsumptionsBetween(user.getId(), LocalDate.now().minusDays(7), LocalDate.now())
                .stream()
                .filter(c -> c.getRecipe() != null)
                .map(c -> new RecipeUsageHistory(c.getRecipe().getId(), c.getConsumedAt(), RecipeUsageHistory.UsageType.CONSUMPTION))
                .collect(Collectors.toList());

        // 3. İkisini birleştirelim
        List<RecipeUsageHistory> fullHistory = Stream.concat(recommendationHistory.stream(), consumptionHistory.stream())
                .collect(Collectors.toList());

        Recommendation recommendation = aiRecommendationStrategy.recommend(user, inventory, dailySummary, cravings, aiModel, apiKey, fullHistory);

        // Önerilen her tarif için besin değerlerini güncelleyelim.
        recommendation.getRecommendedRecipes().forEach(rr -> recipeService.calculateAndSetNutrition(rr.getRecipe()));

        return recommendationRepository.save(recommendation);
    }

    /**
     * Kullanıcının geçmiş önerilerini getirir.
     */
    @Transactional(readOnly = true)
    public List<Recommendation> getRecommendationHistory(String userId) {
        return recommendationRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, 100));
    }
}
