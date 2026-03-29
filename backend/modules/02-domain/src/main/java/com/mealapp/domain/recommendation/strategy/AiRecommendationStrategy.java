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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
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
    private static final int RANKED_RECIPE_LIMIT = 50;
    private static final int FINAL_RECOMMENDATION_LIMIT = 5;
    private static final double INVENTORY_MATCH_WEIGHT = 0.55;
    private static final double RATING_WEIGHT = 0.20;
    private static final double TASTE_PREFERENCE_WEIGHT = 0.25;
    private static final TypeReference<List<PromptEngine.AiResponse>> AI_RESPONSE_TYPE = new TypeReference<>() {};

    @Override
    public List<Recipe> recommend(User user, List<Inventory> currentInventory, DailyConsumptionService.DailyNutritionSummary dailySummary) {
        List<Recipe> safeRecipes = getSafeRecipes(user);

        List<String> dislikedIngredients = normalizeValues(user.getDislikedIngredients());
        List<Recipe> topRecipes = getTopRecipes(safeRecipes, currentInventory, dislikedIngredients);

        String recipesData = formatRecipesData(topRecipes, dislikedIngredients);

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

            return selectedRecipes.isEmpty()
                    ? topRecipes.stream().limit(FINAL_RECOMMENDATION_LIMIT).toList()
                    : selectedRecipes.stream().limit(FINAL_RECOMMENDATION_LIMIT).toList();

        } catch (Exception e) {
            log.error("AI recommendation failed, falling back to top matched recipes", e);
            return topRecipes.stream().limit(FINAL_RECOMMENDATION_LIMIT).toList();
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

    private List<Recipe> getTopRecipes(List<Recipe> safeRecipes, List<Inventory> currentInventory, List<String> dislikedIngredients) {
        return safeRecipes.stream()
                .sorted(Comparator.comparingDouble((Recipe r) -> calculateRankingScore(r, currentInventory, dislikedIngredients)).reversed())
                .limit(RANKED_RECIPE_LIMIT)
                .toList();
    }

    private double calculateRankingScore(Recipe recipe, List<Inventory> currentInventory, List<String> dislikedIngredients) {
        double matchScore = ingredientMatchService.calculateMatchScore(recipe, currentInventory);
        double ratingScore = recipe.getAverageRating() != null ? recipe.getAverageRating() / 10.0 : 0.0;
        double tastePreferenceScore = calculateTastePreferenceScore(recipe, dislikedIngredients);

        return (matchScore * INVENTORY_MATCH_WEIGHT)
                + (ratingScore * RATING_WEIGHT)
                + (tastePreferenceScore * TASTE_PREFERENCE_WEIGHT);
    }

    private double calculateTastePreferenceScore(Recipe recipe, List<String> dislikedIngredients) {
        if (dislikedIngredients.isEmpty()) {
            return 1.0;
        }

        List<String> ingredientNames = getRecipeIngredientNames(recipe);
        if (ingredientNames.isEmpty()) {
            return 1.0;
        }

        Set<String> dislikedKeys = dislikedIngredients.stream()
                .map(this::normalizeKey)
                .collect(Collectors.toSet());

        long overlapCount = ingredientNames.stream()
                .map(this::normalizeKey)
                .filter(dislikedKeys::contains)
                .count();

        return Math.max(0.0, 1.0 - ((double) overlapCount / ingredientNames.size()));
    }

    private String formatRecipesData(List<Recipe> topRecipes, List<String> dislikedIngredients) {
        return topRecipes.stream()
                .map(r -> String.format("- %s (Nutrition: %.0f kcal, P: %.1fg, C: %.1fg, F: %.1fg. Ingredients: %s. Disliked overlap: %s)",
                        r.getTitle(),
                        r.getTotalCalories() != null ? r.getTotalCalories() : 0.0,
                        r.getTotalProtein() != null ? r.getTotalProtein() : 0.0,
                        r.getTotalCarbs() != null ? r.getTotalCarbs() : 0.0,
                        r.getTotalFat() != null ? r.getTotalFat() : 0.0,
                        String.join(", ", getRecipeIngredientNames(r)),
                        getDislikedOverlapSummary(r, dislikedIngredients)))
                .collect(Collectors.joining("\n"));
    }

    private String generateFinalPrompt(User user, List<Inventory> currentInventory, DailyConsumptionService.DailyNutritionSummary dailySummary, String recipesData) {
        String promptTemplate = "User Profile: Name: %s, Goal: %s, Daily Calorie Target: %d kcal. " +
                "Hard Constraints (Allergies): %s. Soft Constraints (Disliked Ingredients): %s. " +
                "Today's Consumed: %d kcal, Protein: %.1fg, Carbs: %.1fg, Fat: %.1fg. " +
                "Available Ingredients in Inventory: %s. " +
                "Recipes:\n%s";

        return promptEngine.generatePrompt(
                promptTemplate,
                user.getName(),
                user.getDietaryGoal(),
                user.getDailyCalorieTarget() != null ? user.getDailyCalorieTarget() : 0,
                formatConstraintList(user.getAllergies()),
                formatConstraintList(user.getDislikedIngredients()),
                dailySummary.totalCalories(),
                dailySummary.totalProtein(),
                dailySummary.totalCarbs(),
                dailySummary.totalFat(),
                currentInventory.stream().map(inv -> inv.getIngredient().getName()).collect(Collectors.joining(", ")),
                recipesData
        );
    }

    private String getDislikedOverlapSummary(Recipe recipe, List<String> dislikedIngredients) {
        if (dislikedIngredients.isEmpty()) {
            return "none";
        }

        Set<String> dislikedKeys = dislikedIngredients.stream()
                .map(this::normalizeKey)
                .collect(Collectors.toSet());

        Set<String> overlaps = getRecipeIngredientNames(recipe).stream()
                .filter(name -> dislikedKeys.contains(normalizeKey(name)))
                .collect(Collectors.toCollection(LinkedHashSet::new));

        return overlaps.isEmpty() ? "none" : String.join(", ", overlaps);
    }

    private List<String> getRecipeIngredientNames(Recipe recipe) {
        if (recipe.getRecipeIngredients() == null || recipe.getRecipeIngredients().isEmpty()) {
            return List.of();
        }

        return recipe.getRecipeIngredients().stream()
                .map(ri -> ri.getIngredient() != null ? ri.getIngredient().getName() : null)
                .filter(name -> name != null && !name.isBlank())
                .toList();
    }

    private String formatConstraintList(List<String> values) {
        List<String> normalized = normalizeValues(values);
        return normalized.isEmpty() ? "none" : String.join(", ", normalized);
    }

    private List<String> normalizeValues(List<String> values) {
        if (values == null || values.isEmpty()) {
            return List.of();
        }

        Set<String> seen = new LinkedHashSet<>();

        return values.stream()
                .map(value -> value == null ? "" : value.trim())
                .filter(value -> !value.isBlank())
                .filter(value -> seen.add(normalizeKey(value)))
                .toList();
    }

    private String normalizeKey(String value) {
        return value.toLowerCase(Locale.ROOT);
    }
}
