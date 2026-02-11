package com.mealapp.app.controller;

import com.mealapp.app.model.dto.RecommendationRequest;
import com.mealapp.app.model.dto.RecommendationResponse;
import com.mealapp.app.service.RecommendationAppService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * Kullanıcıların yemek önerisi isteklerini karşılayan API noktası.
 * Tüm trafik orkestrasyon servisi üzerinden yönetilir.
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
}
