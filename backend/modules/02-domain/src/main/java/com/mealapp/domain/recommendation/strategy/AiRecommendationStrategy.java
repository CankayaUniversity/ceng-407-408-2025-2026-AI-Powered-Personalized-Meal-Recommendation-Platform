package com.mealapp.domain.recommendation.strategy;

import com.mealapp.domain.inventory.entity.Inventory;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.user.entity.User;
import com.mealapp.infrastructure.ai.promptengine.AiPromptEngine;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AiRecommendationStrategy implements RecommendationStrategy {

    private final AiPromptEngine aiPromptEngine;

    @Override
    public List<Recipe> recommend(User user, List<Inventory> currentInventory) {
        String ingredients = currentInventory.stream()
                .map(Inventory::getIngredientName)
                .collect(Collectors.joining(", "));

        String prompt = aiPromptEngine.generatePrompt(
                "Recommend recipes for user %s with diet %s and ingredients: %s",
                user.getName(), user.getDietType(), ingredients);

        // Simulating AI call and database recipe lookup
        // In a real scenario, this would call AI, get recipe names, and fetch from RecipeRepository
        return new ArrayList<>(); 
    }
}
