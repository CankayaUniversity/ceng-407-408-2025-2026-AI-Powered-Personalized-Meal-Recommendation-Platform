package com.mealapp.domain.recommendation.strategy;

import com.mealapp.domain.common.ai.PromptEngine;
import com.mealapp.domain.consumption.service.DailyConsumptionService;
import com.mealapp.domain.inventory.entity.Inventory;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.repository.RecipeRepository;
import com.mealapp.domain.recipe.service.RecipeService;
import com.mealapp.domain.recommendation.service.IngredientMatchService;
import com.mealapp.domain.user.entity.User;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import org.springframework.data.domain.PageRequest;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiRecommendationStrategy implements RecommendationStrategy {

    private final PromptEngine promptEngine;
    private final RecipeRepository recipeRepository;
    private final RecipeService recipeService; // Nutrition hesaplama için eklendi
    private final IngredientMatchService ingredientMatchService;
    private final ObjectMapper objectMapper;

    private static final int CANDIDATE_POOL_SIZE = 100; // Database'den çekilecek en iyi aday sayısı
    private static final TypeReference<List<PromptEngine.AiResponse>> AI_RESPONSE_TYPE = new TypeReference<>() {};

    @Override
    public List<Recipe> recommend(User user, List<Inventory> currentInventory, DailyConsumptionService.DailyNutritionSummary dailySummary) {
        List<Recipe> safeRecipes = getSafeRecipes(user);

        List<Recipe> topRecipes = getTopRecipes(safeRecipes, currentInventory);

        String recipesData = formatRecipesData(topRecipes);

        String finalPrompt = generateFinalPrompt(user, currentInventory, dailySummary, recipesData);

        try {
            String aiResponseRaw = promptEngine.callAi(finalPrompt);
            List<PromptEngine.AiResponse> aiChoices = objectMapper.readValue(aiResponseRaw, AI_RESPONSE_TYPE);

            Map<String, String> insightMap = aiChoices.stream()
                .filter(c -> c.getRecipeTitle() != null)
                .collect(Collectors.toMap(
                    c -> c.getRecipeTitle().toLowerCase(),
                    c -> c.getInsight() != null ? c.getInsight() : "",
                    (existing, replacement) -> existing
                ));

            List<Recipe> selectedRecipes = topRecipes.stream()
                .filter(r -> insightMap.containsKey(r.getTitle().toLowerCase()))
                .map(r -> {
                    r.setAiInsight(insightMap.get(r.getTitle().toLowerCase()));
                    return r;
                })
                .toList();

            return selectedRecipes.isEmpty() ? topRecipes.stream().limit(5).toList() : selectedRecipes;

        } catch (Exception e) {
            log.error("AI recommendation failed, falling back to top matched recipes", e);
            return topRecipes.stream().limit(5).toList();
        }
    }

    private List<Recipe> getSafeRecipes(User user) {
        List<Recipe> recipes = recipeRepository.findTopRecipesSafeForUser(
                user.getDietType() != null ? user.getDietType().name() : "NONE",
                user.getAllergies() != null ? user.getAllergies() : List.of(),
                PageRequest.of(0, CANDIDATE_POOL_SIZE)
        );

        return recipes.stream()
                .map(recipe -> {
                    recipeService.calculateAndSetNutrition(recipe);
                    return recipe;
                })
                .filter(recipe -> recipeService.isCompatibleWithDiet(
                        recipe,
                        user.getDietType() != null ? user.getDietType().name() : "NONE",
                        user.getAllergies()))
                .toList();
    }

    private List<Recipe> getTopRecipes(List<Recipe> safeRecipes, List<Inventory> currentInventory) {
        return safeRecipes.stream()
                .sorted(Comparator.comparingDouble((Recipe r) -> {
                    double matchScore = ingredientMatchService.calculateMatchScore(r, currentInventory);
                    return (matchScore * 0.7) + ((r.getAverageRating() / 10.0) * 0.3);
                }).reversed())
                .limit(50)
                .toList();
    }

    private String formatRecipesData(List<Recipe> topRecipes) {
        return topRecipes.stream()
                .map(r -> String.format("- %s (Nutrition: %.0f kcal, P: %.1fg, C: %.1fg, F: %.1fg. Ingredients: %s)",
                        r.getTitle(),
                        r.getTotalCalories() != null ? r.getTotalCalories() : 0.0,
                        r.getTotalProtein() != null ? r.getTotalProtein() : 0.0,
                        r.getTotalCarbs() != null ? r.getTotalCarbs() : 0.0,
                        r.getTotalFat() != null ? r.getTotalFat() : 0.0,
                        r.getRecipeIngredients().stream()
                                .map(ri -> ri.getIngredient().getName())
                                .collect(Collectors.joining(", "))))
                .collect(Collectors.joining("\n"));
    }

    private String generateFinalPrompt(User user, List<Inventory> currentInventory, DailyConsumptionService.DailyNutritionSummary dailySummary, String recipesData) {
        String promptTemplate = "User Profile: Name: %s, Goal: %s, Daily Calorie Target: %d kcal. " +
                "Today's Consumed: %d kcal, Protein: %.1fg, Carbs: %.1fg, Fat: %.1fg. " +
                "Available Ingredients in Inventory: %s. " +
                "Recipes:\n%s";

        return promptEngine.generatePrompt(
                promptTemplate,
                user.getName(),
                user.getDietaryGoal(),
                user.getDailyCalorieTarget(),
                dailySummary.totalCalories(),
                dailySummary.totalProtein(),
                dailySummary.totalCarbs(),
                dailySummary.totalFat(),
                currentInventory.stream().map(inv -> inv.getIngredient().getName()).collect(Collectors.joining(", ")),
                recipesData
        );
    }
}
