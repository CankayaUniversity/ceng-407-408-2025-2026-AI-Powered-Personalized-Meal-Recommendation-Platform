package com.mealapp.domain.recommendation.strategy;

import com.mealapp.domain.common.ai.PromptEngine;
import com.mealapp.domain.consumption.service.DailyConsumptionService;
import com.mealapp.domain.inventory.entity.Inventory;
import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.repository.RecipeRepository;
import com.mealapp.domain.recipe.service.RecipeService;
import com.mealapp.domain.recommendation.service.IngredientMatchService;
import com.mealapp.domain.recommendation.service.RecipeCompatibilityService;
import com.mealapp.domain.recommendation.entity.Recommendation;
import com.mealapp.domain.recommendation.entity.RecommendedRecipe;
import com.mealapp.domain.user.entity.User;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import com.mealapp.domain.recommendation.dto.RecipeUsageHistory;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
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
    private final RecipeCompatibilityService recipeCompatibilityService;
    private final IngredientMatchService ingredientMatchService;
    private final ObjectMapper objectMapper;

    private static final int CANDIDATE_POOL_SIZE = 100; // Database'den çekilecek en iyi aday sayısı
    private static final int RANKED_RECIPE_LIMIT = 50;
    private static final int FINAL_RECOMMENDATION_LIMIT = 5;
    private static final double INVENTORY_MATCH_WEIGHT = 0.35;
    private static final double RATING_WEIGHT = 0.10;
    private static final double TASTE_PREFERENCE_WEIGHT = 0.15;
    private static final double CRAVING_WEIGHT = 0.15;
    private static final double NUTRITION_MATCH_WEIGHT = 0.15;
    private static final double COOK_HISTORY_WEIGHT = 0.05;
    private static final double TIME_WEIGHT = 0.05;
    private static final double DIVERSITY_WEIGHT = 0.10;
    private static final TypeReference<List<PromptEngine.AiResponse>> AI_RESPONSE_TYPE = new TypeReference<>() {};

    @Override
    public Recommendation recommend(User user, List<Inventory> currentInventory, DailyConsumptionService.DailyNutritionSummary dailySummary, String cravings, String aiModel, String apiKey, List<RecipeUsageHistory> history) {
        List<Recipe> safeRecipes = getSafeRecipes(user);

        List<String> dislikedIngredients = normalizeValues(user.getDislikedIngredients());
        String normalizedCravings = normalizeValue(cravings);
        List<Recipe> topRecipes = getTopRecipes(safeRecipes, currentInventory, dislikedIngredients, normalizedCravings, user, dailySummary, history);

        Recommendation recommendation = Recommendation.builder()
                .user(user)
                .cravings(cravings)
                .aiModel(aiModel)
                .isAiGenerated(!"FREE".equalsIgnoreCase(aiModel))
                .build();

        if ("FREE".equalsIgnoreCase(aiModel)) {
            log.info("Using FREE model for user {}, skipping AI call.", user.getId());
            return buildFallbackRecommendations(topRecipes, currentInventory, dislikedIngredients, normalizedCravings, user, recommendation);
        }

        String recipesData = formatRecipesData(topRecipes, currentInventory, dislikedIngredients, normalizedCravings);
        String finalPrompt = generateFinalPrompt(user, currentInventory, dailySummary, recipesData, normalizedCravings);

        try {
            String aiResponseRaw = promptEngine.callAi(finalPrompt, aiModel, apiKey);
            if (aiResponseRaw == null || aiResponseRaw.trim().isEmpty() || "[]".equals(aiResponseRaw.trim())) {
                log.warn("AI returned empty response for user {}, falling back.", user.getId());
                return buildFallbackRecommendations(topRecipes, currentInventory, dislikedIngredients, normalizedCravings, user, recommendation);
            }

            // Sanitize response: Remove markdown code blocks if present
            String sanitizedResponse = aiResponseRaw.trim();
            if (sanitizedResponse.startsWith("```")) {
                sanitizedResponse = sanitizedResponse.replaceAll("(?s)^```(?:json)?\\s*(.*?)\\s*```$", "$1").trim();
            }

            List<PromptEngine.AiResponse> aiChoices;
            try {
                aiChoices = objectMapper.readValue(sanitizedResponse, AI_RESPONSE_TYPE);
            } catch (Exception parseEx) {
                log.error("AI response JSON parsing failed for user {}. Raw response: {}. Sanitized: {}", user.getId(), aiResponseRaw, sanitizedResponse, parseEx);
                return buildFallbackRecommendations(topRecipes, currentInventory, dislikedIngredients, normalizedCravings, user, recommendation);
            }

            if (aiChoices == null || aiChoices.isEmpty()) {
                log.warn("AI response could not be parsed as list for user {}, falling back.", user.getId());
                return buildFallbackRecommendations(topRecipes, currentInventory, dislikedIngredients, normalizedCravings, user, recommendation);
            }

            Map<String, String> insightMap = aiChoices.stream()
                .filter(c -> c.getRecipeTitle() != null)
                .collect(Collectors.toMap(
                    c -> c.getRecipeTitle().toLowerCase(),
                        c -> c.getInsight() != null ? c.getInsight() : "",
                        (existing, replacement) -> existing
                ));

            topRecipes.stream()
                .filter(r -> insightMap.containsKey(r.getTitle().toLowerCase()))
                .limit(FINAL_RECOMMENDATION_LIMIT)
                .forEach(r -> {
                    String aiInsight = insightMap.get(r.getTitle().toLowerCase());
                    RecommendedRecipe rr = RecommendedRecipe.builder()
                            .recipe(r)
                            .aiInsight(aiInsight == null || aiInsight.isBlank()
                                    ? buildFallbackInsight(r, currentInventory, dislikedIngredients, normalizedCravings, user, true, aiModel)
                                    : aiInsight)
                            .build();
                    recommendation.addRecommendedRecipe(rr);
                });

            if (recommendation.getRecommendedRecipes().isEmpty()) {
                return buildFallbackRecommendations(topRecipes, currentInventory, dislikedIngredients, normalizedCravings, user, recommendation);
            }

            return recommendation;

        } catch (Exception e) {
            log.error("AI recommendation failed, falling back to top matched recipes", e);
            return buildFallbackRecommendations(topRecipes, currentInventory, dislikedIngredients, normalizedCravings, user, recommendation);
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
                .filter(recipe -> recipeCompatibilityService.isCompatibleWithDiet(
                        recipe,
                        user.getDietType() != null ? user.getDietType().name() : "NONE",
                        user.getAllergies()))
                .toList();
    }

    private List<Recipe> getTopRecipes(List<Recipe> safeRecipes, List<Inventory> currentInventory, List<String> dislikedIngredients, String cravings, User user, DailyConsumptionService.DailyNutritionSummary dailySummary, List<RecipeUsageHistory> history) {
        return safeRecipes.stream()
                .sorted(Comparator.comparingDouble((Recipe r) -> calculateRankingScore(r, currentInventory, dislikedIngredients, cravings, user, dailySummary, history)).reversed())
                .limit(RANKED_RECIPE_LIMIT)
                .toList();
    }

    private double calculateRankingScore(Recipe recipe, List<Inventory> currentInventory, List<String> dislikedIngredients, String cravings, User user, DailyConsumptionService.DailyNutritionSummary dailySummary, List<RecipeUsageHistory> history) {
        double matchScore = ingredientMatchService.calculateMatchScore(recipe, currentInventory);
        // Eğer puan yoksa nötr (5/10) bir puan verelim ki yeni tarifler çok geride kalmasın
        double ratingScore = (recipe.getAverageRating() != null && recipe.getRatingCount() != null && recipe.getRatingCount() > 0) 
                ? recipe.getAverageRating() / 10.0 
                : 0.5;
        double tastePreferenceScore = calculateTastePreferenceScore(recipe, dislikedIngredients);
        double cravingScore = calculateCravingScore(recipe, cravings);
        double nutritionScore = calculateNutritionScore(recipe, user, dailySummary);
        double cookHistoryScore = calculateCookHistoryScore(recipe);
        double timeScore = calculateTimeScore(recipe);
        double diversityScore = calculateDiversityScore(recipe, history);

        return (matchScore * INVENTORY_MATCH_WEIGHT)
                + (ratingScore * RATING_WEIGHT)
                + (tastePreferenceScore * TASTE_PREFERENCE_WEIGHT)
                + (cravingScore * CRAVING_WEIGHT)
                + (nutritionScore * NUTRITION_MATCH_WEIGHT)
                + (cookHistoryScore * COOK_HISTORY_WEIGHT)
                + (timeScore * TIME_WEIGHT)
                + (diversityScore * DIVERSITY_WEIGHT);
    }

    private double calculateDiversityScore(Recipe recipe, List<RecipeUsageHistory> history) {
        if (history == null || history.isEmpty()) {
            return 1.0;
        }

        // Bu tarifle ilgili tüm geçmiş kayıtlarını bul
        List<RecipeUsageHistory> recipeHistory = history.stream()
                .filter(h -> h.getRecipeId().equals(recipe.getId()))
                .toList();

        if (recipeHistory.isEmpty()) {
            return 1.0;
        }

        double maxPenalty = 0.0;
        LocalDateTime now = LocalDateTime.now();

        for (RecipeUsageHistory usage : recipeHistory) {
            long daysAgo = ChronoUnit.DAYS.between(usage.getUsageTime(), now);
            double penalty = 0.0;

            if (usage.getType() == RecipeUsageHistory.UsageType.CONSUMPTION) {
                // Tüketim için daha ağır cezalar
                if (daysAgo <= 0) penalty = 0.35;      // Bugün tüketildiyse %35 ceza
                else if (daysAgo == 1) penalty = 0.25; // Dün %25
                else if (daysAgo <= 3) penalty = 0.15; // 3 güne kadar %15
                else if (daysAgo <= 7) penalty = 0.05; // 1 haftaya kadar %5
            } else {
                // Öneri için (sadece pişirilmiş olanlar buraya geliyor ama yine de ayıralım)
                if (daysAgo <= 0) penalty = 0.25;      // Bugün önerilip pişirildiyse %25 ceza
                else if (daysAgo <= 2) penalty = 0.15; // 2 güne kadar %15
                else if (daysAgo <= 5) penalty = 0.05; // 5 güne kadar %5
            }
            
            maxPenalty = Math.max(maxPenalty, penalty);
        }

        return Math.max(0.0, 1.0 - maxPenalty);
    }

    private double calculateTimeScore(Recipe recipe) {
        if (recipe.getPreparationTimeMinutes() == null) return 0.5;
        // 30 dakikanın altındaki tarifler pratik kabul edilir ve bonus alır
        if (recipe.getPreparationTimeMinutes() <= 30) return 1.0;
        if (recipe.getPreparationTimeMinutes() <= 60) return 0.7;
        return 0.4;
    }

    private double calculateNutritionScore(Recipe recipe, User user, DailyConsumptionService.DailyNutritionSummary dailySummary) {
        if (user.getDailyCalorieTarget() == null || user.getDailyCalorieTarget() <= 0) {
            return 1.0;
        }

        double remainingCalories = user.getDailyCalorieTarget() - (dailySummary != null ? dailySummary.totalCalories() : 0);
        if (remainingCalories <= 0) {
            // Hedef aşılmışsa düşük kalorili tariflere daha yüksek puan ver
            return recipe.getTotalCalories() != null && recipe.getTotalCalories() < 400 ? 0.8 : 0.2;
        }

        // Kalan kaloriye yakınlık puanı (ideal bir öğün kalan kalorinin %30-40'ı olmalı)
        double idealMealCalories = remainingCalories * 0.35;
        double recipeCalories = recipe.getTotalCalories() != null ? recipe.getTotalCalories() : 500;
        
        double diffRatio = Math.abs(recipeCalories - idealMealCalories) / idealMealCalories;
        double score = Math.max(0.0, 1.0 - diffRatio);

        // Hedefe göre bonuslar
        if (user.getDietaryGoal() == User.DietaryGoal.LOSE_WEIGHT && recipeCalories < 600) score += 0.2;
        if (user.getDietaryGoal() == User.DietaryGoal.GAIN_WEIGHT && recipeCalories > 600) score += 0.2;
        if (user.getDietaryGoal() == User.DietaryGoal.BUILD_MUSCLE && recipe.getTotalProtein() != null && recipe.getTotalProtein() > 25) score += 0.3;

        return Math.min(1.0, score);
    }

    private double calculateCookHistoryScore(Recipe recipe) {
        // Popüler tariflere küçük bir bonus, ama çok pişirilmişse (bıkkınlık) puanı biraz düşür
        if (recipe.getTotalCookCount() == null || recipe.getTotalCookCount() == 0) return 0.5;
        if (recipe.getTotalCookCount() > 50) return 0.7; // Çok popüler
        if (recipe.getTotalCookCount() > 10) return 0.9; // Optimal popülerlik
        return 0.6;
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
                .map(r -> String.format("- %s (Rating: %.1f/10 (%d reviews), Nutrition: %.0f kcal, P: %.1fg, C: %.1fg, F: %.1fg. Time: %d min. Difficulty: %s. Ingredients: %s. Inventory match: %s. Missing: %s. Disliked overlap: %s. Cook count: %d. Relevance: %.2f)",
                        r.getTitle(),
                        r.getAverageRating() != null ? r.getAverageRating() : 0.0,
                        r.getRatingCount() != null ? r.getRatingCount() : 0,
                        r.getTotalCalories() != null ? r.getTotalCalories() : 0.0,
                        r.getTotalProtein() != null ? r.getTotalProtein() : 0.0,
                        r.getTotalCarbs() != null ? r.getTotalCarbs() : 0.0,
                        r.getTotalFat() != null ? r.getTotalFat() : 0.0,
                        r.getPreparationTimeMinutes() != null ? r.getPreparationTimeMinutes() : 0,
                        r.getDifficulty() != null ? r.getDifficulty() : "MEDIUM",
                        String.join(", ", getRecipeIngredientNames(r)),
                        summarizeIngredients(getMatchedIngredients(r, currentInventory)),
                        summarizeIngredients(getMissingIngredients(r, currentInventory)),
                        getDislikedOverlapSummary(r, dislikedIngredients),
                        r.getTotalCookCount() != null ? r.getTotalCookCount() : 0,
                        calculateCravingScore(r, cravings)))
                .collect(Collectors.joining("\n"));
    }

    private String generateFinalPrompt(User user, List<Inventory> currentInventory, DailyConsumptionService.DailyNutritionSummary dailySummary, String recipesData, String cravings) {
        String promptTemplate = "As a personal nutritionist, provide meal recommendations based on the following user profile and data. " +
                "CRITICAL: Tailor your 'insight' for each recipe to explain EXACTLY why it fits their dietary goal, diet type, and preferences. " +
                "\n\nUser Profile:\n" +
                "- Name: %s\n" +
                "- Dietary Goal: %s (STRICTLY prioritize recipes helping this goal)\n" +
                "- Diet Type: %s (MANDATORY: only suggest recipes compatible with this)\n" +
                "- Daily Calorie Target: %d kcal\n" +
                "- Hard Constraints (Allergies): %s (NEVER suggest these)\n" +
                "- Soft Constraints (Disliked Ingredients): %s (Avoid these if possible)\n" +
                "- Current Cravings: %s (Highly prioritize if matches)\n" +
                "- Diversity Policy: We have already filtered out or penalized recipes that the user has recently consumed or been recommended to ensure variety.\n" +
                "\nToday's Progress:\n" +
                "- Consumed: %d kcal, Protein: %.1fg, Carbs: %.1fg, Fat: %.1fg\n" +
                "\nAvailable Ingredients: %s\n" +
                "\nCandidates Recipes:\n%s";

        return promptEngine.generatePrompt(
                promptTemplate,
                user.getName() != null ? user.getName() : "Guest",
                user.getDietaryGoal() != null ? user.getDietaryGoal() : "Not set",
                user.getDietType() != null ? user.getDietType() : "Not set",
                user.getDailyCalorieTarget() != null ? user.getDailyCalorieTarget() : 2000,
                formatConstraintList(user.getAllergies()),
                formatConstraintList(user.getDislikedIngredients()),
                summarizeCravings(cravings),
                dailySummary != null ? dailySummary.totalCalories() : 0,
                dailySummary != null ? dailySummary.totalProtein() : 0.0,
                dailySummary != null ? dailySummary.totalCarbs() : 0.0,
                dailySummary != null ? dailySummary.totalFat() : 0.0,
                currentInventory.stream()
                        .map(inv -> inv.getIngredient() != null ? inv.getIngredient().getName() : "Unknown")
                        .collect(Collectors.joining(", ")),
                recipesData
        );
    }

    private Recommendation buildFallbackRecommendations(List<Recipe> topRecipes, List<Inventory> currentInventory, List<String> dislikedIngredients, String cravings, User user, Recommendation recommendation) {
        recommendation.setAiGenerated(false);
        topRecipes.stream()
                .limit(FINAL_RECOMMENDATION_LIMIT)
                .forEach(recipe -> {
                    RecommendedRecipe rr = RecommendedRecipe.builder()
                            .recipe(recipe)
                            .aiInsight(buildFallbackInsight(recipe, currentInventory, dislikedIngredients, cravings, user, false, recommendation.getAiModel()))
                            .build();
                    recommendation.addRecommendedRecipe(rr);
                });
        return recommendation;
    }

    private String buildFallbackInsight(Recipe recipe, List<Inventory> currentInventory, List<String> dislikedIngredients, String cravings, User user, boolean aiAccessed, String aiModel) {
        StringBuilder insight = new StringBuilder();

        if (!aiAccessed) {
            if ("FREE".equalsIgnoreCase(aiModel)) {
                insight.append("ℹ️ Seçmiş olduğunuz ücretsiz olan sistemimiz tarafından hazırlanmış öneri modeli tarafından en uygun tarifler seçildi.\n\n");
            } else {
                insight.append("⚠️ Yapay zeka servisine şu an erişilemiyor, sistem tarafından en uygun tarifler seçildi.\n\n");
            }
        }

        // Kullanıcının hedefi ve diyetine göre özelleştirilmiş başlangıç
        if (user.getDietaryGoal() != null || (user.getDietType() != null && user.getDietType() != User.DietType.NONE)) {
            insight.append(String.format("Profilinizdeki %s %s hedefinize uygun olarak: ",
                    (user.getDietType() != null && user.getDietType() != User.DietType.NONE) ? user.getDietType().name().toLowerCase(Locale.ROOT) : "beslenme",
                    user.getDietaryGoal() != null ? user.getDietaryGoal().name().toLowerCase(Locale.ROOT).replace("_", " ") : "rutininize"));
        } else {
            insight.append("Bu tarif sizin için harika bir seçenek: ");
        }

        double matchScore = ingredientMatchService.calculateMatchScore(recipe, currentInventory);
        List<String> matched = getMatchedIngredients(recipe, currentInventory);
        List<String> missing = getMissingIngredients(recipe, currentInventory);

        if (matchScore >= 0.8) {
            insight.append(String.format("Elinizdeki malzemelerin neredeyse tamamı (%s) bu tarifle tam uyumlu. ", summarizeIngredients(matched)));
        } else if (!matched.isEmpty()) {
            insight.append(String.format("Elinizdeki %s kullanarak bu tarifi hazırlayabilirsiniz. ", summarizeIngredients(matched)));
        }

        if (!missing.isEmpty()) {
            insight.append(String.format("Sadece %s ekleyerek öğününüzü tamamlayabilirsiniz. ", summarizeIngredients(missing)));
        }

        if (cravings != null && !cravings.isBlank() && calculateCravingScore(recipe, cravings) > 0.5) {
            insight.append(String.format("Ayrıca canınızın çektiği %s için de çok tatmin edici bir tercih. ", cravings.toLowerCase(Locale.ROOT)));
        }

        // Puan bilgisine göre ek bilgi
        if (recipe.getAverageRating() != null && recipe.getAverageRating() >= 8.0 && recipe.getRatingCount() != null && recipe.getRatingCount() > 0) {
            insight.append(String.format("Kullanıcılar tarafından oldukça beğenilmiş (%.1f puan) ve güvenilir bir tarif. ", recipe.getAverageRating()));
        }

        // Besin değerlerine göre ek bilgi
        if (recipe.getTotalProtein() != null && recipe.getTotalProtein() > 25) {
            insight.append("Yüksek protein içeriğiyle tokluk hissinizi destekler ve kas gelişiminize yardımcı olur. ");
        } else if (recipe.getTotalCalories() != null && recipe.getTotalCalories() < 400) {
            insight.append("Hafif ve düşük kalorili olmasıyla günlük hedefinizi aşmadan doyurucu bir seçenek sunar. ");
        }

        if (recipe.getPreparationTimeMinutes() != null && recipe.getPreparationTimeMinutes() <= 30) {
            insight.append(String.format("Sadece %d dakikada hazırlanabilmesiyle oldukça pratik bir tercih. ", recipe.getPreparationTimeMinutes()));
        } else if (recipe.getDifficulty() == Recipe.Difficulty.EASY) {
            insight.append("Hazırlanışı oldukça kolay ve zahmetsizdir. ");
        }

        if (recipe.getTotalCookCount() != null && recipe.getTotalCookCount() > 50) {
            insight.append("Diğer kullanıcılar tarafından da sıkça tercih edilen popüler bir tariftir. ");
        }

        insight.append("Beslenme çeşitliliğinizi korumak adına son dönemdeki tercihlerinizden farklı bir seçenek olarak öne çıkarılmıştır. ");

        return insight.toString().trim();
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
        if (cravings == null || cravings.isBlank()) {
            return 1.0;
        }

        String lowerCravings = cravings.toLowerCase(Locale.ROOT);
        List<String> cravingKeywords = extractCravingKeywords(cravings);
        if (cravingKeywords.isEmpty()) {
            return 1.0;
        }

        List<String> recipeIngredients = getRecipeIngredientNames(recipe).stream()
                .map(this::normalizeKey)
                .toList();

        String recipeText = Stream.concat(
                        Stream.of(recipe.getTitle(), recipe.getInstructions(), recipe.getCategory()),
                        recipeIngredients.stream()
                )
                .filter(Objects::nonNull)
                .map(this::normalizeKey)
                .collect(Collectors.joining(" "));

        if (recipeText.isBlank()) {
            return 0.0;
        }

        // Negatif istek kontrolü (Örn: "soğansız", "nane içermeyen")
        // "olmasın", "istemiyorum", "içermeyen", "olmayan", "-siz", "-suz", "free", "without" ekleri kontrol edilebilir.
        List<String> negativeKeywords = List.of("olmasin", "istemiyorum", "icermeyen", "olmayan", "suz", "siz", "suz", "suz", "free", "without");
        boolean isNegativeRequest = negativeKeywords.stream().anyMatch(lowerCravings::contains) || 
                                   negativeKeywords.stream().anyMatch(normalizeKey(lowerCravings)::contains);

        if (isNegativeRequest) {
            for (String keyword : cravingKeywords) {
                // Sadece negatif anlam taşıyan kelimenin köküne odaklanalım
                // Örn: "soğansız" içindeki "soğan" yasaklıdır.
                boolean wordIsNegative = negativeKeywords.stream().anyMatch(keyword::endsWith) || 
                                       negativeKeywords.stream().anyMatch(keyword::contains); 
                
                if (!wordIsNegative) continue;

                String root = keyword;
                // Normalize keywords: "siz", "siz", "suz", "suz" all become "siz" or "suz" after replace
                if (keyword.endsWith("siz") || keyword.endsWith("suz")) {
                    root = keyword.substring(0, keyword.length() - 3);
                } else if (keyword.endsWith("free")) {
                    root = keyword.substring(0, keyword.length() - 4);
                } else if (keyword.startsWith("without")) {
                    root = keyword.substring(7);
                } else {
                    // Diğer negatif kelimeler için (olmasın, istemiyorum vb.) kelimenin kendisini değil, 
                    // ondan önceki kelimeyi yasaklamak gerekebilir ama şu an basitleştirmek için 
                    // bu kelimeyi listeden çıkarıyoruz.
                    continue; 
                }

                final String searchRoot = root.trim();
                if (searchRoot.isEmpty()) continue;

                if (recipeIngredients.stream().anyMatch(ing -> ing.contains(searchRoot) || searchRoot.contains(ing)) ||
                    recipeText.contains(searchRoot)) {
                    return 0.0;
                }
            }
            return 1.0;
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

        return Stream.of(normalized.split("[\\s,.;!?]+"))
                .map(String::trim)
                .filter(token -> token.length() >= 2)
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
        if (value == null) return "";
        return value.toLowerCase(Locale.ROOT)
                .replace("ı", "i")
                .replace("ğ", "g")
                .replace("ü", "u")
                .replace("ş", "s")
                .replace("ö", "o")
                .replace("ç", "c");
    }
}
