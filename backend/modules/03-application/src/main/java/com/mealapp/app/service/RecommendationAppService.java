package com.mealapp.app.service;

import com.mealapp.app.model.dto.RecommendationRequest;
import com.mealapp.app.model.dto.RecommendationResponse;
import com.mealapp.app.model.mapper.RecommendationMapper;
import com.mealapp.domain.common.exception.ResourceNotFoundException;
import com.mealapp.domain.inventory.entity.Inventory;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recommendation.service.RecommendationService;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Bu sınıf "Orchestrator" görevini üstlenir.
 * API'den gelen isteği alır, gerekli Domain servislerini koordine eder (User, Inventory, Recommendation)
 * ve sonucu DTO olarak geri döner.
 */
@Service
@RequiredArgsConstructor
public class RecommendationAppService {

    private final RecommendationService recommendationService;
    private final UserService userService;
    private final RecommendationMapper recommendationMapper;

    /**
     * Öneri akışını yöneten ana metod.
     */
    public RecommendationResponse getRecommendations(RecommendationRequest request) {
        // 1. Kullanıcıyı bul
        User user = userService.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı ID: " + request.getUserId()));

        // 2. İstekteki malzemeleri geçici Inventory nesnelerine çevir (Dinamik envanter)
        List<Inventory> dynamicInventory = request.getAvailableIngredients().stream()
                .map(ingredient -> Inventory.builder()
                        .ingredientName(ingredient)
                        .user(user)
                        .build())
                .collect(Collectors.toList());

        // 3. Domain servisinden önerileri al
        List<Recipe> recommendedRecipes = recommendationService.getRecommendations(user, dynamicInventory);

        // 4. Sonucu DTO'ya çevirip dön
        return recommendationMapper.toResponse(recommendedRecipes);
    }
}
