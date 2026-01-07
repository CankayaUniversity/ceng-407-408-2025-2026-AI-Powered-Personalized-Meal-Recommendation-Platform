package org.example.recommendation.service;

import org.example.recipe.catalog.RecipeCatalog;
import org.example.recommendation.dto.RecommendationRequest;
import org.example.recommendation.dto.RecommendationResponse;
import org.example.recommendation.engine.RecommendationEngine;
import org.example.recommendation.engine.RecommendationEngine.ScoredCandidate;
import org.springframework.stereotype.Service;

import java.util.List;


@Service
public class RecommendationService {

    private final RecommendationEngine engine;
    private final RecipeCatalog recipeCatalog;

    public RecommendationService(RecommendationEngine engine, RecipeCatalog recipeCatalog) {
        this.engine = engine;
        this.recipeCatalog = recipeCatalog;
    }

    public RecommendationResponse generateRecommendations(RecommendationRequest request) {
        List<ScoredCandidate> scored = engine.score(
                request.getIngredients(),
                request.getAllergies(),
                request.getDislikedFoods(),
                recipeCatalog.findAll()
        );

        List<RecommendationResponse.RecommendationItem> items = scored.stream()
                .limit(3)
                .map(s -> new RecommendationResponse.RecommendationItem(
                        s.getTitle(),
                        buildReason(s),
                        new RecommendationResponse.Nutrition(520, 28, 18, 60), // still stub
                        round2(s.getScore()),
                        s.getMissing()
                ))
                .toList();

        return new RecommendationResponse(items);
    }

    private String buildReason(ScoredCandidate s) {
        if (s.getMissing().isEmpty()) {
            return "Full match: all required ingredients available.";
        }
        return "Partial match: " + s.getMatched().size() + " matched, " + s.getMissing().size() + " missing (" + String.join(", ", s.getMissing()) + ").";
    }

    private double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
