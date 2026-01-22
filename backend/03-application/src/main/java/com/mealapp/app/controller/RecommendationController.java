package com.mealapp.app.controller;

import com.mealapp.domain.recommendation.model.dto.RecommendationRequest;
import com.mealapp.domain.recommendation.model.dto.RecommendationResponse;
import com.mealapp.domain.recommendation.strategy.RecommendationStrategy;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationStrategy aiRecommendationStrategy;

    @PostMapping
    public RecommendationResponse getRecommendation(@RequestBody RecommendationRequest request) {
        return aiRecommendationStrategy.recommend(request);
    }
}
