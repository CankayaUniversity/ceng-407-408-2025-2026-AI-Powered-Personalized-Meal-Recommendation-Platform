package com.mealapp.app.service;

import com.mealapp.app.model.dto.recommendation.RecommendationRequest;
import com.mealapp.app.model.dto.recommendation.RecommendationResponse;
import com.mealapp.app.model.mapper.recommendation.RecommendationMapper;
import com.mealapp.domain.common.exception.ResourceNotFoundException;
import com.mealapp.domain.inventory.entity.Inventory;
import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.repository.IngredientRepository;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recommendation.service.RecommendationService;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.LinkedHashSet;

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
    private final IngredientRepository ingredientRepository;
    private final RecommendationMapper recommendationMapper;

    /**
     * Öneri akışını yöneten ana metod.
     */
    @Transactional(readOnly = true)
    public RecommendationResponse getRecommendations(RecommendationRequest request) {
        // 1. Kullanıcıyı bul
        User user = userService.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı ID: " + request.getUserId()));

        // Request ile gelen tercihler varsa geçici olarak uygula (AI prompt için)
        applyRequestPreferences(user, request);
        
        String normalizedCravings = normalizeValue(request.getCravings());

        // 2. İstekteki malzemeleri geçici Inventory nesnelerine çevir (Dinamik envanter)
        List<String> rawIngredients = request.getAvailableIngredients();
        if (rawIngredients == null) {
            rawIngredients = List.of();
        }
        List<Inventory> dynamicInventory = normalizeValues(rawIngredients).stream()
                .map(ingredientName -> {
                    Ingredient ingredient = ingredientRepository.findByNameIgnoreCase(ingredientName)
                            .orElseGet(() -> Ingredient.builder()
                                    .name(ingredientName)
                                    .category(Ingredient.Category.OTHER)
                                    .build());
                    return Inventory.builder()
                            .ingredient(ingredient)
                            .build();
                    })
                    .toList();

        // 3. Domain servisinden önerileri al
        List<Recipe> recommendedRecipes = recommendationService.getRecommendations(user, dynamicInventory, normalizedCravings, request.getAiModel());

        // 4. Sonucu DTO'ya çevirip dön
        return recommendationMapper.toResponse(
                recommendedRecipes,
                dynamicInventory.stream()
                        .map(inventory -> inventory.getIngredient() != null ? inventory.getIngredient().getName() : null)
                        .filter(name -> name != null && !name.isBlank())
                        .toList()
        );
    }

    private void applyRequestPreferences(User user, RecommendationRequest request) {
        if (request.getDislikedIngredients() != null) {
            user.setDislikedIngredients(normalizeValues(request.getDislikedIngredients()));
        }
        if (request.getAllergies() != null) {
            user.setAllergies(normalizeValues(request.getAllergies()));
        }
        if (request.getDietaryGoal() != null && !request.getDietaryGoal().isBlank()) {
            try {
                user.setDietaryGoal(User.DietaryGoal.valueOf(request.getDietaryGoal().toUpperCase(Locale.ROOT)));
            } catch (IllegalArgumentException ignored) {}
        }
        if (request.getDietType() != null && !request.getDietType().isBlank()) {
            try {
                user.setDietType(User.DietType.valueOf(request.getDietType().toUpperCase(Locale.ROOT)));
            } catch (IllegalArgumentException ignored) {}
        }
    }

    private List<String> normalizeValues(List<String> values) {
        if (values == null || values.isEmpty()) {
            return List.of();
        }

        Set<String> seen = new LinkedHashSet<>();

        return values.stream()
                .map(value -> value == null ? "" : value.trim())
                .filter(value -> !value.isBlank())
                .filter(value -> seen.add(value.toLowerCase(Locale.ROOT)))
                .toList();
    }

    private String normalizeValue(String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim();
        return normalized.isBlank() ? null : normalized;
    }
}
