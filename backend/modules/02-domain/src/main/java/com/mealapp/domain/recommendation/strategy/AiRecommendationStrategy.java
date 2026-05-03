package com.mealapp.domain.recommendation.strategy;

import com.mealapp.domain.common.ai.PromptEngine;
import com.mealapp.domain.consumption.service.DailyConsumptionService;
import com.mealapp.domain.inventory.entity.Inventory;
import com.mealapp.domain.recipe.entity.Ingredient;
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
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

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
    private static final double INVENTORY_MATCH_WEIGHT = 0.45;
    private static final double RATING_WEIGHT = 0.15;
    private static final double TASTE_PREFERENCE_WEIGHT = 0.20;
    private static final double CRAVING_WEIGHT = 0.20;
    private static final TypeReference<List<PromptEngine.AiResponse>> AI_RESPONSE_TYPE = new TypeReference<>() {};

    @Override
    public List<Recipe> recommend(User user, List<Inventory> currentInventory, DailyConsumptionService.DailyNutritionSummary dailySummary, String cravings) {
        List<Recipe> safeRecipes = getSafeRecipes(user);

        List<String> dislikedIngredients = normalizeValues(user.getDislikedIngredients());
        String normalizedCravings = normalizeValue(cravings);
        List<Recipe> topRecipes = getTopRecipes(safeRecipes, currentInventory, dislikedIngredients, normalizedCravings);

        String recipesData = formatRecipesData(topRecipes, currentInventory, dislikedIngredients, normalizedCravings);

        String finalPrompt = generateFinalPrompt(user, currentInventory, dailySummary, recipesData, normalizedCravings);

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
                    String aiInsight = insightMap.get(r.getTitle().toLowerCase());
                    r.setAiInsight(aiInsight == null || aiInsight.isBlank()
                            ? buildFallbackInsight(r, currentInventory, dislikedIngredients, normalizedCravings)
                            : aiInsight);
                    return r;
                })
                .toList();

            return selectedRecipes.isEmpty()
                    ? buildFallbackRecommendations(topRecipes, currentInventory, dislikedIngredients, normalizedCravings)
                    : selectedRecipes.stream().limit(FINAL_RECOMMENDATION_LIMIT).toList();

        } catch (Exception e) {
            log.error("AI recommendation failed, falling back to top matched recipes", e);
            return buildFallbackRecommendations(topRecipes, currentInventory, dislikedIngredients, normalizedCravings);
        }
    }

    private List<Recipe> getSafeRecipes(User user) {
        List<Recipe> recipes = recipeRepository.findTopRecipesSafeForUser(
                user.getId(),
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

    private List<Recipe> getTopRecipes(List<Recipe> safeRecipes, List<Inventory> currentInventory, List<String> dislikedIngredients, String cravings) {
        return safeRecipes.stream()
                .sorted(Comparator.comparingDouble((Recipe r) -> calculateRankingScore(r, currentInventory, dislikedIngredients, cravings)).reversed())
                .limit(RANKED_RECIPE_LIMIT)
                .toList();
    }

    private double calculateRankingScore(Recipe recipe, List<Inventory> currentInventory, List<String> dislikedIngredients, String cravings) {
        double matchScore = ingredientMatchService.calculateMatchScore(recipe, currentInventory);
        double ratingScore = recipe.getAverageRating() != null ? recipe.getAverageRating() / 10.0 : 0.0;
        double tastePreferenceScore = calculateTastePreferenceScore(recipe, dislikedIngredients);
        double cravingScore = calculateCravingScore(recipe, cravings);

        return (matchScore * INVENTORY_MATCH_WEIGHT)
                + (ratingScore * RATING_WEIGHT)
                + (tastePreferenceScore * TASTE_PREFERENCE_WEIGHT)
                + (cravingScore * CRAVING_WEIGHT);
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

    private String formatRecipesData(List<Recipe> topRecipes, List<Inventory> currentInventory, List<String> dislikedIngredients, String cravings) {
        return topRecipes.stream()
                .map(r -> String.format("- %s (Nutrition: %.0f kcal, P: %.1fg, C: %.1fg, F: %.1fg. Ingredients: %s. Inventory match: %s. Missing ingredients: %s. Disliked overlap: %s. Craving relevance: %.2f. Cravings: %s)",
                        r.getTitle(),
                        r.getTotalCalories() != null ? r.getTotalCalories() : 0.0,
                        r.getTotalProtein() != null ? r.getTotalProtein() : 0.0,
                        r.getTotalCarbs() != null ? r.getTotalCarbs() : 0.0,
                        r.getTotalFat() != null ? r.getTotalFat() : 0.0,
                        String.join(", ", getRecipeIngredientNames(r)),
                        summarizeIngredients(getMatchedIngredients(r, currentInventory)),
                        summarizeIngredients(getMissingIngredients(r, currentInventory)),
                        getDislikedOverlapSummary(r, dislikedIngredients),
                        calculateCravingScore(r, cravings),
                        summarizeCravings(cravings)))
                .collect(Collectors.joining("\n"));
    }

    private String generateFinalPrompt(User user, List<Inventory> currentInventory, DailyConsumptionService.DailyNutritionSummary dailySummary, String recipesData, String cravings) {
        String promptTemplate = "User Profile: Name: %s, Goal: %s, Daily Calorie Target: %d kcal. " +
                "Hard Constraints (Allergies): %s. Soft Constraints (Disliked Ingredients): %s. " +
                "Current Cravings (highlight these): %s. " +
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
                summarizeCravings(cravings),
                dailySummary.totalCalories(),
                dailySummary.totalProtein(),
                dailySummary.totalCarbs(),
                dailySummary.totalFat(),
                currentInventory.stream().map(inv -> inv.getIngredient().getName()).collect(Collectors.joining(", ")),
                recipesData
        );
    }

    private List<Recipe> buildFallbackRecommendations(List<Recipe> topRecipes, List<Inventory> currentInventory, List<String> dislikedIngredients, String cravings) {
        return topRecipes.stream()
                .limit(FINAL_RECOMMENDATION_LIMIT)
                .map(recipe -> {
                    recipe.setAiInsight(buildFallbackInsight(recipe, currentInventory, dislikedIngredients, cravings));
                    return recipe;
                })
                .toList();
    }

    private String buildFallbackInsight(Recipe recipe, List<Inventory> currentInventory, List<String> dislikedIngredients, String cravings) {
        String matchedSummary = summarizeIngredients(getMatchedIngredients(recipe, currentInventory));
        String missingSummary = summarizeIngredients(getMissingIngredients(recipe, currentInventory));
        String overlapSummary = getDislikedOverlapSummary(recipe, dislikedIngredients);
        double cravingScore = calculateCravingScore(recipe, cravings);

        StringBuilder builder = new StringBuilder("We prioritized this recipe because it fits your pantry");
        if (!"none".equals(matchedSummary)) {
            builder.append(" and uses ").append(matchedSummary);
        }
        builder.append(".");

        if (cravings != null && !cravings.isBlank()) {
            if (cravingScore > 0.0) {
                builder.append(" It also aligns with your craving for ").append(cravings).append(".");
            } else {
                builder.append(" It still stays close to your overall profile even though the craving match is softer today.");
            }
        }

        if (!"none".equals(missingSummary)) {
            builder.append(" You may still need ").append(missingSummary).append(".");
        }

        if (!"none".equals(overlapSummary)) {
            builder.append(" We kept the disliked overlap low, but note ").append(overlapSummary).append(".");
        }

        return builder.toString();
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

    private List<String> getMatchedIngredients(Recipe recipe, List<Inventory> currentInventory) {
        Set<String> inventoryKeys = currentInventory.stream()
                .map(Inventory::getIngredient)
                .filter(Objects::nonNull)
                .map(Ingredient::getName)
                .map(this::normalizeKey)
                .collect(Collectors.toSet());

        return getRecipeIngredientNames(recipe).stream()
                .filter(name -> inventoryKeys.contains(normalizeKey(name)))
                .collect(Collectors.toCollection(LinkedHashSet::new))
                .stream()
                .toList();
    }

    private List<String> getMissingIngredients(Recipe recipe, List<Inventory> currentInventory) {
        Set<String> inventoryKeys = currentInventory.stream()
                .map(Inventory::getIngredient)
                .filter(Objects::nonNull)
                .map(Ingredient::getName)
                .map(this::normalizeKey)
                .collect(Collectors.toSet());

        return getRecipeIngredientNames(recipe).stream()
                .filter(name -> !inventoryKeys.contains(normalizeKey(name)))
                .collect(Collectors.toCollection(LinkedHashSet::new))
                .stream()
                .toList();
    }

    private double calculateCravingScore(Recipe recipe, String cravings) {
        List<String> cravingKeywords = extractCravingKeywords(cravings);
        if (cravingKeywords.isEmpty()) {
            return 1.0;
        }

        String recipeText = Stream.concat(
                        Stream.of(recipe.getTitle(), recipe.getInstructions()),
                        getRecipeIngredientNames(recipe).stream()
                )
                .filter(Objects::nonNull)
                .map(this::normalizeKey)
                .collect(Collectors.joining(" "));

        if (recipeText.isBlank()) {
            return 0.0;
        }

        long matchedKeywords = cravingKeywords.stream()
                .filter(recipeText::contains)
                .count();

        double keywordScore = (double) matchedKeywords / cravingKeywords.size();
        double phraseBoost = recipeText.contains(normalizeKey(cravings)) ? 0.25 : 0.0;

        return Math.min(1.0, keywordScore + phraseBoost);
    }

    private String formatConstraintList(List<String> values) {
        List<String> normalized = normalizeValues(values);
        return normalized.isEmpty() ? "none" : String.join(", ", normalized);
    }

    private String summarizeCravings(String cravings) {
        String normalized = normalizeValue(cravings);
        return normalized == null ? "none" : normalized;
    }

    private String summarizeIngredients(List<String> ingredients) {
        return ingredients == null || ingredients.isEmpty() ? "none" : String.join(", ", ingredients);
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

    private List<String> extractCravingKeywords(String cravings) {
        String normalized = normalizeValue(cravings);
        if (normalized == null) {
            return List.of();
        }

        Set<String> seen = new LinkedHashSet<>();

        return Stream.of(normalized.split("[,\\s]+"))
                .map(String::trim)
                .filter(token -> token.length() >= 3)
                .map(this::normalizeKey)
                .filter(seen::add)
                .toList();
    }

    private String normalizeValue(String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim();
        return normalized.isBlank() ? null : normalized;
    }

    private String normalizeKey(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT);
    }
}
