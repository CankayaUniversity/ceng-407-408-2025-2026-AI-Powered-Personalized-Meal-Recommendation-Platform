package org.example.recommendation.controller;

import jakarta.validation.Valid;
import org.example.recommendation.dto.RecommendationRequest;
import org.example.recommendation.dto.RecommendationResponse;
import org.example.recommendation.service.RecommendationService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/recommendations")
public class RecommendationController {

    private final RecommendationService recommendationService;

    public RecommendationController(RecommendationService recommendationService) {
        this.recommendationService = recommendationService;
    }

    @PostMapping
    public RecommendationResponse recommend(@Valid @RequestBody RecommendationRequest request) {
        return recommendationService.generateRecommendations(request);
    }
}
