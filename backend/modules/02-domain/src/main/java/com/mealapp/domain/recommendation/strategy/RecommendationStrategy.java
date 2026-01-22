package com.mealapp.domain.recommendation.strategy;

import com.mealapp.domain.recommendation.model.dto.RecommendationResponse;
import com.mealapp.domain.recommendation.model.dto.RecommendationRequest;

public interface RecommendationStrategy {
    RecommendationResponse recommend(RecommendationRequest request);
}
