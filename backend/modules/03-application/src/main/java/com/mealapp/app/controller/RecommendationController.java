package com.mealapp.app.controller;

import com.mealapp.app.model.dto.recommendation.MenuRecommendationRequest;
import com.mealapp.app.model.dto.recommendation.MenuRecommendationHistoryResponse;
import com.mealapp.app.model.dto.recommendation.MenuRecommendationResponse;
import com.mealapp.app.model.dto.recommendation.RecommendationRequest;
import com.mealapp.app.model.dto.recommendation.RecommendationResponse;
import com.mealapp.domain.common.exception.MealAppDomainException;
import jakarta.validation.Valid;
import com.mealapp.app.service.RecommendationAppService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Kullanıcıların yemek önerisi isteklerini karşılayan API noktası.
 */
@RestController
@RequestMapping("/api/v1/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationAppService recommendationAppService;

    /**
     * Kullanıcıdan gelen malzemelere ve tercihlere göre AI destekli yemek önerisi döner.
     */
    @PostMapping
    public RecommendationResponse getRecommendation(@RequestBody RecommendationRequest request) {
        return recommendationAppService.getRecommendations(request);
    }

    @PostMapping("/menu")
    public MenuRecommendationResponse getMenuRecommendations(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody MenuRecommendationRequest request
    ) {
        return recommendationAppService.getMenuRecommendations(requireAuthenticatedUserId(jwt), request);
    }

    /**
     * Kullanıcının geçmiş önerilerini listeler.
     */
    @GetMapping("/history/{userId}")
    public List<RecommendationResponse> getHistory(@PathVariable String userId) {
        return recommendationAppService.getRecommendationHistory(userId);
    }

    @GetMapping("/menu/history/{userId}")
    public List<MenuRecommendationHistoryResponse> getMenuHistory(@PathVariable String userId) {
        return recommendationAppService.getMenuRecommendationHistory(userId);
    }

    /**
     * Önerilen bir tarife puan ve yorum verir.
     */
    @PostMapping("/rate")
    public ResponseEntity<Void> rateRecommendation(@RequestBody RecommendationRateRequest request) {
        recommendationAppService.rateRecommendation(
                request.getUserId(),
                request.getRecommendedRecipeId(),
                request.getRating(),
                request.getComment()
        );
        return ResponseEntity.ok().build();
    }

    /**
     * Önerilen bir tarifi "pişirildi/yapıldı" olarak işaretler.
     */
    @PostMapping("/cook/{recommendedRecipeId}")
    public ResponseEntity<Void> markAsCooked(@PathVariable Long recommendedRecipeId) {
        recommendationAppService.markAsCooked(recommendedRecipeId);
        return ResponseEntity.ok().build();
    }

    @Data
    public static class RecommendationRateRequest {
        private String userId;
        private Long recommendedRecipeId;
        private Integer rating;
        private String comment;
    }

    private String requireAuthenticatedUserId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new MealAppDomainException("Kimliği doğrulanmış kullanıcı bilgisi bulunamadı.");
        }

        return jwt.getSubject();
    }
}
