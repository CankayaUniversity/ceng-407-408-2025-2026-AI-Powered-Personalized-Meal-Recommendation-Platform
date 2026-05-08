package com.mealapp.app.service;

import com.mealapp.app.model.dto.recommendation.RecommendationRequest;
import com.mealapp.app.model.dto.recommendation.RecommendationResponse;
import com.mealapp.app.model.mapper.recommendation.RecommendationMapper;
import com.mealapp.domain.common.exception.ResourceNotFoundException;
import com.mealapp.domain.inventory.entity.Inventory;
import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.repository.IngredientRepository;
import com.mealapp.domain.recommendation.entity.Recommendation;
import com.mealapp.domain.recommendation.entity.RecommendedRecipe;
import com.mealapp.domain.recommendation.repository.RecommendedRecipeRepository;
import com.mealapp.domain.recommendation.service.RecommendationService;
import com.mealapp.domain.recipe.service.RecipeRatingService;
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
 */
@Service
@RequiredArgsConstructor
public class RecommendationAppService {
    private final RecommendationService recommendationService;
    private final UserService userService;
    private final IngredientRepository ingredientRepository;
    private final RecommendationMapper recommendationMapper;
    private final RecommendedRecipeRepository recommendedRecipeRepository;
    private final RecipeRatingService recipeRatingService;

    /**
     * Öneri akışını yöneten ana metod.
     */
    @Transactional
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
        Recommendation recommendation = recommendationService.getRecommendations(user, dynamicInventory, normalizedCravings, request.getAiModel());

        // 4. Sonucu DTO'ya çevirip dön
        return recommendationMapper.toResponse(
                recommendation,
                dynamicInventory.stream()
                        .map(inventory -> inventory.getIngredient() != null ? inventory.getIngredient().getName() : null)
                        .filter(name -> name != null && !name.isBlank())
                        .toList()
        );
    }

    /**
     * Kullanıcının geçmiş önerilerini getirir.
     */
    @Transactional(readOnly = true)
    public List<RecommendationResponse> getRecommendationHistory(String userId) {
        List<Recommendation> history = recommendationService.getRecommendationHistory(userId);
        return history.stream()
                .map(r -> recommendationMapper.toResponse(r, null))
                .toList();
    }

    /**
     * Önerilen bir tarife puan ve yorum verir.
     */
    @Transactional
    public void rateRecommendation(String userId, Long recommendedRecipeId, Integer rating, String comment) {
        RecommendedRecipe rr = recommendedRecipeRepository.findById(recommendedRecipeId)
                .orElseThrow(() -> new ResourceNotFoundException("Önerilen tarif bulunamadı ID: " + recommendedRecipeId));

        if (rating != null) {
            if (rating < 1 || rating > 10) {
                throw new IllegalArgumentException("Puan 1 ile 10 arasında olmalıdır.");
            }
            rr.setUserRating(rating);
            
            // Kullanıcı "ikisini bir arada işleyelim" dediği için RecipeRatingService'i de çağırıyoruz.
            recipeRatingService.rateRecipe(userId, rr.getRecipe().getId(), rating, comment);
        }
        
        rr.setUserComment(comment);
        recommendedRecipeRepository.save(rr);
    }

    /**
     * Önerilen bir tarifi "pişirildi/yapıldı" olarak işaretler.
     */
    @Transactional
    public void markAsCooked(Long recommendedRecipeId) {
        RecommendedRecipe rr = recommendedRecipeRepository.findById(recommendedRecipeId)
                .orElseThrow(() -> new ResourceNotFoundException("Önerilen tarif bulunamadı ID: " + recommendedRecipeId));

        if (!rr.isCooked()) {
            rr.setCooked(true);
            
            // Tarifin toplam pişirilme sayısını artır
            Recipe recipe = rr.getRecipe();
            if (recipe.getTotalCookCount() == null) {
                recipe.setTotalCookCount(1);
            } else {
                recipe.setTotalCookCount(recipe.getTotalCookCount() + 1);
            }
            
            recommendedRecipeRepository.save(rr);
        }
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
