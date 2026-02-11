package com.mealapp.domain.recommendation.service;

import com.mealapp.domain.inventory.entity.Inventory;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.recommendation.strategy.RecommendationStrategy;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

/**
 * Bu servis, tüm öneri sürecini koordine eder.
 * Kullanıcı tercihlerini (User), eldeki malzemeleri (Inventory) ve mevcut tarifleri (Recipe) birleştirerek
 * uygun stratejiyi (AI veya Popülerlik) tetikler.
 */
@Service
@RequiredArgsConstructor
public class RecommendationService {

    private final RecommendationStrategy aiRecommendationStrategy;

    /**
     * Kullanıcı ve envanter bilgilerine dayanarak yemek tarifleri önerir.
     * Saf Domain nesneleriyle çalışır.
     */
    public List<Recipe> getRecommendations(User user, List<Inventory> inventory) {
        return aiRecommendationStrategy.recommend(user, inventory);
    }
}
