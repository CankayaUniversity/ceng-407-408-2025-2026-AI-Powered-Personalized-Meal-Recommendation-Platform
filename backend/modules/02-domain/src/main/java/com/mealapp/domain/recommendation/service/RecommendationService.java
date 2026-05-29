package com.mealapp.domain.recommendation.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.mealapp.domain.common.ai.AiResponseParser;
import com.mealapp.domain.common.ai.PromptEngine;
import com.mealapp.domain.consumption.service.DailyConsumptionService;
import com.mealapp.domain.inventory.entity.Inventory;
import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.entity.RecipeCategory;
import com.mealapp.domain.recipe.entity.RecipeIngredient;
import com.mealapp.domain.recipe.repository.RecipeRepository;
import com.mealapp.domain.recipe.service.RecipeNutritionCalculator;
import com.mealapp.domain.recipe.service.RecipeService;
import com.mealapp.domain.recommendation.dto.MenuRecommendationResult;
import com.mealapp.domain.recommendation.dto.RecipeUsageHistory;
import com.mealapp.domain.recommendation.entity.Recommendation;
import com.mealapp.domain.recommendation.entity.RecommendedRecipe;
import com.mealapp.domain.recommendation.repository.RecommendationRepository;
import com.mealapp.domain.recommendation.strategy.RecommendationStrategy;
import com.mealapp.domain.user.entity.User;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.LinkedHashMap;
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
public class RecommendationService {

    private static final int MENU_COUNT = 3;
    private static final int CATEGORY_POOL_LIMIT = 10;
    private static final int CATEGORY_QUERY_LIMIT = 150;
    private static final double INVENTORY_MATCH_WEIGHT = 0.40;
    private static final double PALATE_AND_CRAVING_WEIGHT = 0.20;
    private static final double NUTRITION_MATCH_WEIGHT = 0.15;
    private static final double DIVERSITY_WEIGHT = 0.15;
    private static final double POPULARITY_PREP_WEIGHT = 0.10;
    private static final String EMPTY_ALLERGY_SENTINEL = "__mealai_no_allergy__";
    private static final TypeReference<List<AiMenuChoice>> AI_MENU_RESPONSE_TYPE = new TypeReference<>() {};

    private final RecipeService recipeService;
    private final DailyConsumptionService dailyConsumptionService;
    private final RecommendationStrategy aiRecommendationStrategy;
    private final RecommendationRepository recommendationRepository;
    private final RecipeRepository recipeRepository;
    private final RecipeCompatibilityService recipeCompatibilityService;
    private final IngredientMatchService ingredientMatchService;
    private final PromptEngine promptEngine;
    private final ObjectMapper objectMapper;

    @Transactional
    public Recommendation getRecommendations(User user, List<Inventory> inventory, String cravings, String aiModel, String apiKey) {
        DailyConsumptionService.DailyNutritionSummary dailySummary = dailyConsumptionService.getDailyNutritionSummary(user.getId(), LocalDate.now());
        List<RecipeUsageHistory> fullHistory = getRecentUsageHistory(user.getId());

        Recommendation recommendation = aiRecommendationStrategy.recommend(user, safeInventory(inventory), dailySummary, cravings, aiModel, apiKey, fullHistory);
        recommendation.getRecommendedRecipes().forEach(rr -> recipeService.calculateAndSetNutrition(rr.getRecipe()));

        return recommendationRepository.save(recommendation);
    }

    @Transactional(readOnly = true)
    public MenuRecommendationResult getMenuRecommendations(
            User user,
            List<Inventory> inventory,
            List<RecipeCategory> selectedCategories,
            String cravings,
            String aiModel,
            String apiKey
    ) {
        if (user == null || user.getId() == null || user.getId().isBlank()) {
            throw new IllegalArgumentException("Authenticated user is required for menu recommendations.");
        }

        List<RecipeCategory> categories = normalizeCategories(selectedCategories);
        if (categories.isEmpty()) {
            throw new IllegalArgumentException("At least one recipe category must be selected.");
        }

        List<Inventory> currentInventory = safeInventory(inventory);
        List<String> dislikedIngredients = normalizeValues(user.getDislikedIngredients());
        String normalizedCravings = normalizeValue(cravings);
        List<RecipeUsageHistory> history = getRecentUsageHistory(user.getId());

        Map<RecipeCategory, List<ScoredRecipe>> candidatePools = new LinkedHashMap<>();
        for (RecipeCategory category : categories) {
            List<ScoredRecipe> topCandidates = getTopCandidatesForCategory(
                    user,
                    category,
                    currentInventory,
                    dislikedIngredients,
                    normalizedCravings,
                    history
            );
            candidatePools.put(category, topCandidates);
        }

        if (isFreeModel(aiModel)) {
            return MenuRecommendationResult.builder()
                    .aiGenerated(false)
                    .menus(buildFallbackMenus(candidatePools, currentInventory, user, normalizedCravings, true))
                    .build();
        }

        try {
            List<MenuRecommendationResult.MenuAlternative> aiMenus = buildAiMenus(
                    user,
                    currentInventory,
                    candidatePools,
                    normalizedCravings,
                    aiModel,
                    apiKey
            );
            if (!aiMenus.isEmpty()) {
                return MenuRecommendationResult.builder()
                        .aiGenerated(true)
                        .menus(aiMenus)
                        .build();
            }
        } catch (Exception ex) {
            log.warn("AI menu recommendation failed for user {}, falling back to algorithmic menus.", user.getId(), ex);
        }

        return MenuRecommendationResult.builder()
                .aiGenerated(false)
                .menus(buildFallbackMenus(candidatePools, currentInventory, user, normalizedCravings, false))
                .build();
    }

    @Transactional(readOnly = true)
    public List<Recommendation> getRecommendationHistory(String userId) {
        return recommendationRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, 100));
    }

    private List<ScoredRecipe> getTopCandidatesForCategory(
            User user,
            RecipeCategory category,
            List<Inventory> inventory,
            List<String> dislikedIngredients,
            String cravings,
            List<RecipeUsageHistory> history
    ) {
        User.DietType strictDietType = user.getDietType() == null || user.getDietType() == User.DietType.NONE
                ? null
                : user.getDietType();

        List<String> allergies = normalizeValues(user.getAllergies()).stream()
                .map(this::normalizeKey)
                .toList();
        if (allergies.isEmpty()) {
            allergies = List.of(EMPTY_ALLERGY_SENTINEL);
        }

        return recipeRepository.findMenuCandidatesForUser(
                        user.getId(),
                        category,
                        strictDietType,
                        allergies,
                        PageRequest.of(0, CATEGORY_QUERY_LIMIT)
                ).stream()
                .map(recipe -> {
                    recipeService.calculateAndSetNutrition(recipe);
                    return recipe;
                })
                .filter(recipe -> recipeCompatibilityService.isCompatibleWithDiet(
                        recipe,
                        user.getDietType() != null ? user.getDietType().name() : User.DietType.NONE.name(),
                        user.getAllergies()
                ))
                .map(recipe -> new ScoredRecipe(recipe, calculateMenuScore(recipe, inventory, dislikedIngredients, cravings, user, history)))
                .sorted(Comparator.comparingDouble(ScoredRecipe::score).reversed())
                .limit(CATEGORY_POOL_LIMIT)
                .toList();
    }

    private double calculateMenuScore(
            Recipe recipe,
            List<Inventory> inventory,
            List<String> dislikedIngredients,
            String cravings,
            User user,
            List<RecipeUsageHistory> history
    ) {
        double inventoryScore = ingredientMatchService.calculateMatchScore(recipe, inventory);
        double palateScore = (calculateTastePreferenceScore(recipe, dislikedIngredients) + calculateCravingScore(recipe, cravings)) / 2.0;
        double nutritionScore = calculateNutritionScore(recipe, user);
        double diversityScore = calculateDiversityScore(recipe, history);
        double popularityPrepScore = calculatePopularityPrepScore(recipe);

        return (inventoryScore * INVENTORY_MATCH_WEIGHT)
                + (palateScore * PALATE_AND_CRAVING_WEIGHT)
                + (nutritionScore * NUTRITION_MATCH_WEIGHT)
                + (diversityScore * DIVERSITY_WEIGHT)
                + (popularityPrepScore * POPULARITY_PREP_WEIGHT);
    }

    private List<MenuRecommendationResult.MenuAlternative> buildAiMenus(
            User user,
            List<Inventory> inventory,
            Map<RecipeCategory, List<ScoredRecipe>> candidatePools,
            String cravings,
            String aiModel,
            String apiKey
    ) throws Exception {
        String prompt = buildMenuPrompt(user, inventory, candidatePools, cravings);
        String rawResponse = promptEngine.callAi(prompt, aiModel, apiKey);
        if (rawResponse == null || rawResponse.isBlank() || "[]".equals(rawResponse.trim())) {
            return List.of();
        }

        List<AiMenuChoice> choices;
        String sanitizedResponse = null;
        try {
            Set<String> requiredCategoryKeys = candidatePools.keySet().stream()
                    .map(Enum::name)
                    .collect(Collectors.toCollection(LinkedHashSet::new));
            sanitizedResponse = AiResponseParser.sanitizeJsonArray(rawResponse);
            choices = AiResponseParser.parseStrictJsonArray(
                    sanitizedResponse,
                    objectMapper,
                    AI_MENU_RESPONSE_TYPE,
                    (item, index) -> validateAiMenuChoice(item, index, requiredCategoryKeys)
            );
        } catch (Exception parseEx) {
            log.error(
                    "AI menu response JSON parsing or validation failed for user {}. Raw response: {}. Sanitized: {}",
                    user.getId(),
                    preview(rawResponse),
                    preview(sanitizedResponse),
                    parseEx
            );
            throw parseEx;
        }
        if (choices == null || choices.isEmpty()) {
            return List.of();
        }

        List<MenuRecommendationResult.MenuAlternative> menus = choices.stream()
                .filter(Objects::nonNull)
                .sorted(Comparator.comparingInt(choice -> choice.getRank() != null ? choice.getRank() : MENU_COUNT + 1))
                .limit(MENU_COUNT)
                .map(choice -> buildValidatedAiMenu(choice, candidatePools))
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(java.util.ArrayList::new));

        while (menus.size() < MENU_COUNT) {
            menus.add(buildFallbackMenu(menus.size() + 1, candidatePools, false, null));
        }

        return menus.stream()
                .limit(MENU_COUNT)
                .toList();
    }

    private MenuRecommendationResult.MenuAlternative buildValidatedAiMenu(
            AiMenuChoice choice,
            Map<RecipeCategory, List<ScoredRecipe>> candidatePools
    ) {
        int rank = choice.getRank() != null && choice.getRank() > 0 ? choice.getRank() : 1;
        Map<RecipeCategory, Recipe> courses = new LinkedHashMap<>();
        Map<String, Long> selectedRecipeIds = choice.getCourseRecipeIds() == null ? Map.of() : choice.getCourseRecipeIds();

        for (RecipeCategory category : candidatePools.keySet()) {
            Long recipeId = selectedRecipeIds.get(category.name());
            Recipe recipe = findCandidateById(candidatePools.get(category), recipeId);
            if (recipe == null) {
                recipe = selectRankedRecipe(candidatePools.get(category), rank);
            }
            if (recipe != null) {
                courses.put(category, recipe);
            }
        }

        if (courses.isEmpty()) {
            return null;
        }

        return buildMenu(
                rank,
                normalizeValue(choice.getTitle()) != null ? choice.getTitle().trim() : defaultMenuTitle(rank),
                courses,
                normalizeValue(choice.getInsight()) != null ? choice.getInsight().trim() : "AI selected this menu from the highest scoring category pools."
        );
    }

    private List<MenuRecommendationResult.MenuAlternative> buildFallbackMenus(
            Map<RecipeCategory, List<ScoredRecipe>> candidatePools,
            List<Inventory> inventory,
            User user,
            String cravings,
            boolean freeModel
    ) {
        return Stream.iterate(1, rank -> rank + 1)
                .limit(MENU_COUNT)
                .map(rank -> buildFallbackMenu(rank, candidatePools, freeModel, buildFallbackInsight(rank, candidatePools, inventory, user, cravings, freeModel)))
                .toList();
    }

    private MenuRecommendationResult.MenuAlternative buildFallbackMenu(
            int rank,
            Map<RecipeCategory, List<ScoredRecipe>> candidatePools,
            boolean freeModel,
            String insight
    ) {
        Map<RecipeCategory, Recipe> courses = new LinkedHashMap<>();
        for (Map.Entry<RecipeCategory, List<ScoredRecipe>> entry : candidatePools.entrySet()) {
            Recipe recipe = selectRankedRecipe(entry.getValue(), rank);
            if (recipe != null) {
                courses.put(entry.getKey(), recipe);
            }
        }

        String rationale = normalizeValue(insight) != null
                ? insight
                : (freeModel
                ? "Free model mode is active, so this menu was assembled from backend score ranks."
                : "AI service was unavailable, so this menu was assembled from backend score ranks.");

        return buildMenu(rank, defaultMenuTitle(rank), courses, rationale);
    }

    private MenuRecommendationResult.MenuAlternative buildMenu(int rank, String title, Map<RecipeCategory, Recipe> courses, String insight) {
        double totalKcal = 0.0;
        double totalProtein = 0.0;
        double totalCarbs = 0.0;
        double totalFat = 0.0;
        int totalPreparationTime = 0;

        for (Recipe recipe : courses.values()) {
            totalKcal += safeDouble(RecipeNutritionCalculator.kcalPerServing(recipe));
            totalProtein += perServing(recipe.getTotalProtein(), recipe);
            totalCarbs += perServing(recipe.getTotalCarbs(), recipe);
            totalFat += perServing(recipe.getTotalFat(), recipe);
            totalPreparationTime += recipe.getPreparationTimeMinutes() != null ? recipe.getPreparationTimeMinutes() : 0;
        }

        return MenuRecommendationResult.MenuAlternative.builder()
                .rank(rank)
                .title(title)
                .courses(courses)
                .insight(insight)
                .totalKcal(roundOneDecimal(totalKcal))
                .totalProtein(roundOneDecimal(totalProtein))
                .totalCarbs(roundOneDecimal(totalCarbs))
                .totalFat(roundOneDecimal(totalFat))
                .totalPreparationTime(totalPreparationTime)
                .build();
    }

    private String buildMenuPrompt(
            User user,
            List<Inventory> inventory,
            Map<RecipeCategory, List<ScoredRecipe>> candidatePools,
            String cravings
    ) {
        DailyConsumptionService.DailyNutritionSummary dailySummary = dailyConsumptionService.getDailyNutritionSummary(user.getId(), LocalDate.now());

        return """
                You are MealAI's menu planner.
                Output ONLY valid JSON; no additional text, headers, preamble, markdown formatting, or code fences.
                Select exactly 3 alternative menu combinations from the candidate pool.
                Use only recipe IDs that appear under their category.
                Optimize culinary pairing, macro balance, inventory usage, and total preparation time.
                Return a JSON array. Every object must contain exactly these fields:
                rank: positive integer
                title: non-empty string
                courseRecipeIds: object whose keys exactly match the selected category names and whose values are recipe IDs from those category pools
                insight: non-empty string
                Do not include trailing commas or comments.
                Required schema example:
                [{"rank":1,"title":"Recommended Menu 1 (Favorite)","courseRecipeIds":{"CORBALAR":101,"ANA_YEMEKLER":205},"insight":"..."}]

                User:
                name=%s
                dietType=%s
                dietaryGoal=%s
                dailyCalorieTarget=%d
                allergies=%s
                dislikedIngredients=%s
                cravings=%s
                todayConsumedKcal=%d
                todayProtein=%.1f
                inventory=%s

                Candidate pool:
                %s
                """.formatted(
                user.getName() != null ? user.getName() : "Guest",
                user.getDietType() != null ? user.getDietType().name() : User.DietType.NONE.name(),
                user.getDietaryGoal() != null ? user.getDietaryGoal().name() : "NONE",
                user.getDailyCalorieTarget() != null ? user.getDailyCalorieTarget() : 0,
                summarizeValues(user.getAllergies()),
                summarizeValues(user.getDislikedIngredients()),
                cravings != null ? cravings : "none",
                dailySummary != null ? dailySummary.totalCalories() : 0,
                dailySummary != null ? dailySummary.totalProtein() : 0.0,
                summarizeInventory(inventory),
                formatCandidatePools(candidatePools)
        );
    }

    private String formatCandidatePools(Map<RecipeCategory, List<ScoredRecipe>> candidatePools) {
        return candidatePools.entrySet().stream()
                .map(entry -> {
                    String recipes = entry.getValue().stream()
                            .map(scored -> {
                                Recipe recipe = scored.recipe();
                                return "{recipeId:%d,title:\"%s\",score:%.3f,kcalPerServing:%.1f,proteinPerServing:%.1f,prepMinutes:%d,rating:%.1f,ingredients:\"%s\"}"
                                        .formatted(
                                                recipe.getId(),
                                                escapePrompt(recipe.getTitle()),
                                                scored.score(),
                                                safeDouble(RecipeNutritionCalculator.kcalPerServing(recipe)),
                                                perServing(recipe.getTotalProtein(), recipe),
                                                recipe.getPreparationTimeMinutes() != null ? recipe.getPreparationTimeMinutes() : 0,
                                                recipe.getAverageRating() != null ? recipe.getAverageRating() : 0.0,
                                                escapePrompt(String.join(", ", getRecipeIngredientNames(recipe)))
                                        );
                            })
                            .collect(Collectors.joining(","));
                    return entry.getKey().name() + ":[" + recipes + "]";
                })
                .collect(Collectors.joining("\n"));
    }

    private void validateAiMenuChoice(JsonNode item, int index, Set<String> requiredCategoryKeys) {
        String context = "AI menu choice[" + index + "]";
        AiResponseParser.requireExactObject(item, Set.of("rank", "title", "courseRecipeIds", "insight"), context);
        AiResponseParser.requirePositiveIntField(item, "rank", context);
        AiResponseParser.requireTextField(item, "title", context);
        AiResponseParser.requireTextField(item, "insight", context);
        JsonNode courseRecipeIds = AiResponseParser.requireObjectField(item, "courseRecipeIds", context);
        AiResponseParser.requireExactObjectKeys(courseRecipeIds, requiredCategoryKeys, context + ".courseRecipeIds");
        AiResponseParser.requirePositiveLongValues(courseRecipeIds, context + ".courseRecipeIds");
    }

    private String buildFallbackInsight(
            int rank,
            Map<RecipeCategory, List<ScoredRecipe>> candidatePools,
            List<Inventory> inventory,
            User user,
            String cravings,
            boolean freeModel
    ) {
        List<Recipe> recipes = candidatePools.values().stream()
                .map(pool -> selectRankedRecipe(pool, rank))
                .filter(Objects::nonNull)
                .toList();

        double avgInventoryMatch = recipes.isEmpty()
                ? 0.0
                : recipes.stream().mapToDouble(recipe -> ingredientMatchService.calculateMatchScore(recipe, inventory)).average().orElse(0.0);
        int prepTime = recipes.stream()
                .map(Recipe::getPreparationTimeMinutes)
                .filter(Objects::nonNull)
                .mapToInt(Integer::intValue)
                .sum();

        String source = freeModel
                ? "Free model mode is active; MealAI used the backend mathematical ranking model."
                : "The AI service is unavailable; MealAI used the backend mathematical ranking model.";
        String cravingText = cravings == null ? "" : " Your craving signal was included as a palate tie-breaker.";
        String dietText = user.getDietType() != null && user.getDietType() != User.DietType.NONE
                ? " All recipes were strictly filtered for " + user.getDietType().name().toLowerCase(Locale.ROOT).replace("_", " ") + "."
                : "";

        return "%s Menu %d combines the #%d ranked compatible recipes per selected category, averages %.0f%% pantry alignment, and totals %d prep minutes.%s%s"
                .formatted(source, rank, rank, avgInventoryMatch * 100.0, prepTime, dietText, cravingText);
    }

    private List<RecipeUsageHistory> getRecentUsageHistory(String userId) {
        List<RecipeUsageHistory> recommendationHistory = recommendationRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, 3))
                .stream()
                .flatMap(r -> r.getRecommendedRecipes().stream()
                        .filter(RecommendedRecipe::isCooked)
                        .map(rr -> new RecipeUsageHistory(rr.getRecipe().getId(), r.getCreatedAt(), RecipeUsageHistory.UsageType.RECOMMENDATION)))
                .toList();

        List<RecipeUsageHistory> consumptionHistory = dailyConsumptionService.getConsumptionsBetween(userId, LocalDate.now().minusDays(7), LocalDate.now())
                .stream()
                .filter(c -> c.getRecipe() != null)
                .map(c -> new RecipeUsageHistory(c.getRecipe().getId(), c.getConsumedAt(), RecipeUsageHistory.UsageType.CONSUMPTION))
                .toList();

        return Stream.concat(recommendationHistory.stream(), consumptionHistory.stream())
                .toList();
    }

    private double calculateNutritionScore(Recipe recipe, User user) {
        Double targetKcalPerMeal = calculateTargetKcalPerMeal(user);
        Double recipeKcalPerServing = RecipeNutritionCalculator.kcalPerServing(recipe);
        double score = RecipeNutritionCalculator.calorieProximityScore(recipeKcalPerServing, targetKcalPerMeal);

        if (recipeKcalPerServing == null || targetKcalPerMeal == null) {
            return score;
        }

        if (user.getDietaryGoal() == User.DietaryGoal.LOSE_WEIGHT && recipeKcalPerServing < targetKcalPerMeal) {
            score += 0.2;
        }
        if (user.getDietaryGoal() == User.DietaryGoal.GAIN_WEIGHT && recipeKcalPerServing > targetKcalPerMeal) {
            score += 0.2;
        }
        if (user.getDietaryGoal() == User.DietaryGoal.BUILD_MUSCLE && perServing(recipe.getTotalProtein(), recipe) > 25.0) {
            score += 0.3;
        }

        return Math.min(1.0, score);
    }

    private double calculatePopularityPrepScore(Recipe recipe) {
        double ratingScore = recipe.getAverageRating() != null && recipe.getRatingCount() != null && recipe.getRatingCount() > 0
                ? recipe.getAverageRating() / 10.0
                : 0.5;
        double timeScore = calculateTimeScore(recipe);
        return (ratingScore + timeScore) / 2.0;
    }

    private double calculateTimeScore(Recipe recipe) {
        if (recipe.getPreparationTimeMinutes() == null) {
            return 0.5;
        }
        if (recipe.getPreparationTimeMinutes() <= 30) {
            return 1.0;
        }
        if (recipe.getPreparationTimeMinutes() <= 60) {
            return 0.7;
        }
        return 0.4;
    }

    private double calculateDiversityScore(Recipe recipe, List<RecipeUsageHistory> history) {
        if (history == null || history.isEmpty() || recipe.getId() == null) {
            return 1.0;
        }

        List<RecipeUsageHistory> recipeHistory = history.stream()
                .filter(item -> Objects.equals(item.getRecipeId(), recipe.getId()))
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
                if (daysAgo <= 0) penalty = 0.35;
                else if (daysAgo == 1) penalty = 0.25;
                else if (daysAgo <= 3) penalty = 0.15;
                else if (daysAgo <= 7) penalty = 0.05;
            } else {
                if (daysAgo <= 0) penalty = 0.25;
                else if (daysAgo <= 2) penalty = 0.15;
                else if (daysAgo <= 5) penalty = 0.05;
            }
            maxPenalty = Math.max(maxPenalty, penalty);
        }
        return Math.max(0.0, 1.0 - maxPenalty);
    }

    private double calculateTastePreferenceScore(Recipe recipe, List<String> dislikedIngredients) {
        if (dislikedIngredients == null || dislikedIngredients.isEmpty()) {
            return 1.0;
        }

        Set<String> dislikedKeys = dislikedIngredients.stream()
                .map(this::normalizeKey)
                .collect(Collectors.toSet());
        List<String> ingredientNames = getRecipeIngredientNames(recipe);
        if (ingredientNames.isEmpty()) {
            return 1.0;
        }

        long overlapCount = ingredientNames.stream()
                .map(this::normalizeKey)
                .filter(dislikedKeys::contains)
                .count();

        return Math.max(0.0, 1.0 - ((double) overlapCount / ingredientNames.size()));
    }

    private double calculateCravingScore(Recipe recipe, String cravings) {
        if (cravings == null || cravings.isBlank()) {
            return 1.0;
        }

        List<String> keywords = Stream.of(cravings.split("[\\s,.;!?]+"))
                .map(this::normalizeKey)
                .filter(token -> token.length() >= 2)
                .distinct()
                .toList();
        if (keywords.isEmpty()) {
            return 1.0;
        }

        String recipeText = Stream.concat(
                        Stream.of(recipe.getTitle(), recipe.getInstructions(), recipe.getCategory() != null ? recipe.getCategory().name() : null),
                        getRecipeIngredientNames(recipe).stream()
                )
                .filter(Objects::nonNull)
                .map(this::normalizeKey)
                .collect(Collectors.joining(" "));
        if (recipeText.isBlank()) {
            return 0.0;
        }

        long matches = keywords.stream().filter(recipeText::contains).count();
        return Math.min(1.0, (double) matches / keywords.size());
    }

    private List<String> getRecipeIngredientNames(Recipe recipe) {
        if (recipe.getRecipeIngredients() == null || recipe.getRecipeIngredients().isEmpty()) {
            return List.of();
        }

        return recipe.getRecipeIngredients().stream()
                .map(RecipeIngredient::getIngredient)
                .filter(Objects::nonNull)
                .map(Ingredient::getName)
                .filter(name -> name != null && !name.isBlank())
                .toList();
    }

    private Recipe selectRankedRecipe(List<ScoredRecipe> scoredRecipes, int rank) {
        if (scoredRecipes == null || scoredRecipes.isEmpty()) {
            return null;
        }
        int index = Math.min(Math.max(rank - 1, 0), scoredRecipes.size() - 1);
        return scoredRecipes.get(index).recipe();
    }

    private Recipe findCandidateById(List<ScoredRecipe> scoredRecipes, Long recipeId) {
        if (recipeId == null || scoredRecipes == null) {
            return null;
        }
        return scoredRecipes.stream()
                .map(ScoredRecipe::recipe)
                .filter(recipe -> Objects.equals(recipe.getId(), recipeId))
                .findFirst()
                .orElse(null);
    }

    private List<RecipeCategory> normalizeCategories(List<RecipeCategory> categories) {
        if (categories == null || categories.isEmpty()) {
            return List.of();
        }

        Set<RecipeCategory> seen = new LinkedHashSet<>();
        return categories.stream()
                .filter(Objects::nonNull)
                .filter(seen::add)
                .toList();
    }

    private List<Inventory> safeInventory(List<Inventory> inventory) {
        return inventory == null ? List.of() : inventory.stream().filter(Objects::nonNull).toList();
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

    private String normalizeValue(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isBlank() ? null : normalized;
    }

    private String normalizeKey(String value) {
        if (value == null) {
            return "";
        }
        return value.toLowerCase(Locale.ROOT)
                .replace("ı", "i")
                .replace("ğ", "g")
                .replace("ü", "u")
                .replace("ş", "s")
                .replace("ö", "o")
                .replace("ç", "c")
                .trim();
    }

    private Double calculateTargetKcalPerMeal(User user) {
        if (user == null || user.getDailyCalorieTarget() == null || user.getDailyCalorieTarget() <= 0) {
            return null;
        }
        return user.getDailyCalorieTarget() / 3.0;
    }

    private double perServing(Double value, Recipe recipe) {
        return value == null ? 0.0 : value / RecipeNutritionCalculator.safeServings(recipe);
    }

    private double safeDouble(Double value) {
        return value == null ? 0.0 : value;
    }

    private double roundOneDecimal(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private String defaultMenuTitle(int rank) {
        return rank == 1 ? "Recommended Menu 1 (Favorite)" : "Menu " + rank;
    }

    private boolean isFreeModel(String aiModel) {
        return aiModel == null || aiModel.isBlank() || "FREE".equalsIgnoreCase(aiModel);
    }

    private String summarizeValues(List<String> values) {
        List<String> normalized = normalizeValues(values);
        return normalized.isEmpty() ? "none" : String.join(", ", normalized);
    }

    private String summarizeInventory(List<Inventory> inventory) {
        String summary = safeInventory(inventory).stream()
                .filter(item -> item.getIngredient() != null)
                .filter(item -> item.getQuantity() != null && item.getQuantity() > 0)
                .map(this::formatInventoryItem)
                .distinct()
                .collect(Collectors.joining(", "));
        return summary.isBlank() ? "none" : summary;
    }

    private String formatInventoryItem(Inventory item) {
        String name = item.getIngredient().getName() == null ? "Unknown" : item.getIngredient().getName().trim();
        String unit = item.getUnit() == null || item.getUnit().isBlank() ? "unit" : item.getUnit().trim();
        return "%s %.1f %s".formatted(name, item.getQuantity(), unit);
    }

    private String escapePrompt(String value) {
        return Objects.toString(value, "")
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", " ")
                .replace("\n", " ");
    }

    private String preview(String value) {
        if (value == null) {
            return "<null>";
        }
        String normalized = value.replace("\r", "\\r").replace("\n", "\\n");
        return normalized.length() <= 2000 ? normalized : normalized.substring(0, 2000) + "...";
    }

    private record ScoredRecipe(Recipe recipe, double score) {}

    @Data
    private static class AiMenuChoice {
        private Integer rank;
        private String title;
        private Map<String, Long> courseRecipeIds;
        private String insight;
    }
}
