package com.mealapp.domain.recommendation.strategy;

import com.mealapp.domain.recommendation.model.dto.RecommendationRequest;
import com.mealapp.domain.recommendation.model.dto.RecommendationResponse;
import com.mealapp.infrastructure.ai.promptengine.AiPromptEngine;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AiRecommendationStrategy implements RecommendationStrategy {

    private final AiPromptEngine aiPromptEngine;

    @Override
    public RecommendationResponse recommend(RecommendationRequest request) {
        String prompt = aiPromptEngine.generatePrompt("Recommend a meal with ingredients: %s", 
                String.join(", ", request.getAvailableIngredients()));
        
        // Simulating AI call
        RecommendationResponse response = new RecommendationResponse();
        response.setAiInsight("Based on your ingredients, I suggest making a Salad.");
        response.setRecommendedRecipes(List.of("Fresh Garden Salad"));
        return response;
    }
}
