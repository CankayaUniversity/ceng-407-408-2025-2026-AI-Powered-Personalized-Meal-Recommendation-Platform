package com.mealapp.domain.recommendation.strategy;

import com.mealapp.domain.common.ai.PromptEngine;
import com.mealapp.domain.consumption.service.DailyConsumptionService;
import com.mealapp.domain.inventory.entity.Inventory;
import com.mealapp.domain.inventory.entity.InventoryGroup;
import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.entity.RecipeIngredient;
import com.mealapp.domain.recipe.repository.RecipeRepository;
import com.mealapp.domain.recipe.service.RecipeService;
import com.mealapp.domain.recommendation.service.IngredientMatchService;
import com.mealapp.domain.recommendation.service.RecipeCompatibilityService;
import com.mealapp.domain.recommendation.entity.Recommendation;
import com.mealapp.domain.recommendation.entity.RecommendedRecipe;
import com.mealapp.domain.user.entity.User;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import com.mealapp.domain.recommendation.dto.RecipeUsageHistory;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiRecommendationStrategyTest {

    @Mock
    private PromptEngine promptEngine;
    @Mock
    private RecipeRepository recipeRepository;
    @Mock
    private RecipeService recipeService;
    @Mock
    private RecipeCompatibilityService recipeCompatibilityService;
    @Mock
    private IngredientMatchService ingredientMatchService;
    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private AiRecommendationStrategy strategy;

    private User user;
    private List<Inventory> inventory;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id("test-user")
                .name("John Doe")
                .dietType(User.DietType.NONE)
                .build();

        Ingredient chicken = Ingredient.builder().name("Chicken").build();
        InventoryGroup group = InventoryGroup.builder()
                .name("Home")
                .users(new java.util.ArrayList<>(List.of(user)))
                .build();
        inventory = List.of(Inventory.builder().ingredient(chicken).inventoryGroup(group).build());
    }

    @Test
    void shouldRecommendRecipesUsingHybridScoring() {
        // Given
        Recipe highRatingLowMatch = Recipe.builder()
                .id(1L)
                .title("High Rating")
                .averageRating(10.0)
                .recipeIngredients(List.of()) // Null olmaması için
                .build();

        Recipe lowRatingHighMatch = Recipe.builder()
                .id(2L)
                .title("High Match")
                .averageRating(2.0)
                .recipeIngredients(List.of()) // Null olmaması için
                .build();

        when(recipeRepository.findTopRecipesSafeForUser(anyString(), anyString(), anyList(), any(Pageable.class)))
                .thenReturn(List.of(highRatingLowMatch, lowRatingHighMatch));

        // Mock recipeCompatibilityService.isCompatibleWithDiet to return true
        lenient().when(recipeCompatibilityService.isCompatibleWithDiet(any(), anyString(), any())).thenReturn(true);

        // High Match has 1.0 match score, High Rating has 0.0 match score
        when(ingredientMatchService.calculateMatchScore(eq(highRatingLowMatch), anyList())).thenReturn(0.0);
        when(ingredientMatchService.calculateMatchScore(eq(lowRatingHighMatch), anyList())).thenReturn(1.0);

        when(promptEngine.generatePrompt(anyString(), any(Object[].class))).thenReturn("mock prompt");
        when(promptEngine.callAi(anyString(), anyString(), any())).thenReturn("[{\"recipeTitle\": \"High Match\", \"insight\": \"Great choice!\"}]");

        DailyConsumptionService.DailyNutritionSummary dailySummary = new DailyConsumptionService.DailyNutritionSummary(1500, 10, 150.0, 50.0, 50.0);

        // When
        Recommendation recommendations = strategy.recommend(user, inventory, dailySummary, "spicy chicken", "gemini", null, Collections.emptyList());

        // Then
        assertFalse(recommendations.getRecommendedRecipes().isEmpty());
        assertEquals(2L, recommendations.getRecommendedRecipes().get(0).getRecipe().getId());
        assertEquals("Great choice!", recommendations.getRecommendedRecipes().get(0).getAiInsight());
    }

    @Test
    void shouldDeprioritizeRecipesContainingDislikedIngredientsInFallbackRanking() {
        user.setDislikedIngredients(List.of("Onion"));

        Recipe dislikedRecipe = recipeWithIngredients(1L, "Onion Bowl", 5.0, "Chicken", "Onion");
        Recipe preferredRecipe = recipeWithIngredients(2L, "Herb Bowl", 5.0, "Chicken", "Garlic");

        when(recipeRepository.findTopRecipesSafeForUser(anyString(), anyString(), anyList(), any(Pageable.class)))
                .thenReturn(List.of(dislikedRecipe, preferredRecipe));

        lenient().when(recipeCompatibilityService.isCompatibleWithDiet(any(), anyString(), any())).thenReturn(true);
        when(ingredientMatchService.calculateMatchScore(eq(dislikedRecipe), anyList())).thenReturn(0.8);
        when(ingredientMatchService.calculateMatchScore(eq(preferredRecipe), anyList())).thenReturn(0.8);

        when(promptEngine.generatePrompt(anyString(), any(Object[].class))).thenReturn("mock prompt");
        when(promptEngine.callAi(anyString(), anyString(), any())).thenThrow(new RuntimeException("AI unavailable"));

        DailyConsumptionService.DailyNutritionSummary dailySummary = new DailyConsumptionService.DailyNutritionSummary(1500, 10, 150.0, 50.0,50.0);

        Recommendation recommendations = strategy.recommend(user, inventory, dailySummary, "comfort food", "gemini", null, Collections.emptyList());

        assertFalse(recommendations.getRecommendedRecipes().isEmpty());
        assertEquals(2L, recommendations.getRecommendedRecipes().get(0).getRecipe().getId());
    }

    @Test
    void shouldIncludeHardAndSoftConstraintsInPromptContext() {
        user.setAllergies(List.of("Peanut"));
        user.setDislikedIngredients(List.of("Onion"));

        Recipe recipe = recipeWithIngredients(3L, "Balanced Plate", 4.5, "Chicken", "Garlic");

        lenient().when(recipeRepository.findTopRecipesSafeForUser(anyString(), anyString(), anyList(), any(Pageable.class)))
                .thenReturn(List.of(recipe));

        lenient().when(recipeCompatibilityService.isCompatibleWithDiet(any(), anyString(), any())).thenReturn(true);
        lenient().when(ingredientMatchService.calculateMatchScore(eq(recipe), anyList())).thenReturn(1.0);
        lenient().when(promptEngine.generatePrompt(anyString(), any(Object[].class))).thenAnswer(invocation -> {
            String template = invocation.getArgument(0);
            return template + " :: " + Arrays.deepToString(invocation.getArguments());
        });
        lenient().when(promptEngine.callAi(anyString(), anyString(), any())).thenReturn("[]");

        DailyConsumptionService.DailyNutritionSummary dailySummary = new DailyConsumptionService.DailyNutritionSummary(1500, 10, 150.0, 50.0,50.0);

        strategy.recommend(user, inventory, dailySummary, "garlic", "gemini", null, Collections.emptyList());

        ArgumentCaptor<String> promptCaptor = ArgumentCaptor.forClass(String.class);
        verify(promptEngine).callAi(promptCaptor.capture(), anyString(), any());

        String finalPrompt = promptCaptor.getValue();
        assertTrue(finalPrompt.contains("Hard Constraints (Allergies)"));
        assertTrue(finalPrompt.contains("Soft Constraints (Disliked Ingredients)"));
        assertTrue(finalPrompt.contains("Current Cravings"));
        assertTrue(finalPrompt.contains("Peanut"));
        assertTrue(finalPrompt.contains("Onion"));
        assertTrue(finalPrompt.contains("garlic"));
    }

    @Test
    void shouldHandleNegativeCravingsInScoring() {
        Recipe withOnion = recipeWithIngredients(10L, "Onion Soup", 5.0, "Onion", "Water");
        Recipe withoutOnion = recipeWithIngredients(11L, "Water Soup", 5.0, "Water");

        when(recipeRepository.findTopRecipesSafeForUser(anyString(), anyString(), anyList(), any(Pageable.class)))
                .thenReturn(List.of(withOnion, withoutOnion));

        lenient().when(recipeCompatibilityService.isCompatibleWithDiet(any(), anyString(), any())).thenReturn(true);
        when(ingredientMatchService.calculateMatchScore(any(), anyList())).thenReturn(1.0);

        when(promptEngine.generatePrompt(anyString(), any(Object[].class))).thenReturn("mock prompt");
        when(promptEngine.callAi(anyString(), anyString(), any())).thenThrow(new RuntimeException("AI unavailable"));

        DailyConsumptionService.DailyNutritionSummary dailySummary = new DailyConsumptionService.DailyNutritionSummary(1500, 10, 150.0, 50.0, 50.0);

        // When: User wants something WITHOUT onion (English data)
        Recommendation recommendations = strategy.recommend(user, inventory, dailySummary, "onion-free meal", "gemini", null, Collections.emptyList());

        // Then: Recipe without onion should be first
        assertFalse(recommendations.getRecommendedRecipes().isEmpty());
        assertEquals(11L, recommendations.getRecommendedRecipes().get(0).getRecipe().getId());
        assertTrue(recommendations.getRecommendedRecipes().get(0).getAiInsight().contains("Yapay zeka servisine şu an erişilemiyor"));
    }

    @Test
    void shouldShowFreeModelMessageWhenFreeModelIsSelected() {
        Recipe recipe = recipeWithIngredients(1L, "Test Recipe", 8.0, "Ingredient");
        when(recipeRepository.findTopRecipesSafeForUser(anyString(), anyString(), anyList(), any(Pageable.class)))
                .thenReturn(List.of(recipe));
        lenient().when(recipeCompatibilityService.isCompatibleWithDiet(any(), anyString(), any())).thenReturn(true);
        when(ingredientMatchService.calculateMatchScore(any(), anyList())).thenReturn(1.0);

        DailyConsumptionService.DailyNutritionSummary dailySummary = new DailyConsumptionService.DailyNutritionSummary(1500, 10, 150.0, 50.0, 50.0);

        // When: User selects FREE model
        Recommendation recommendations = strategy.recommend(user, inventory, dailySummary, "", "FREE", null, Collections.emptyList());

        // Then: Should contain the free model message
        assertFalse(recommendations.getRecommendedRecipes().isEmpty());
        assertTrue(recommendations.getRecommendedRecipes().get(0).getAiInsight().contains("Seçmiş olduğunuz ücretsiz olan sistemimiz tarafından hazırlanmış öneri modeli"));
        assertFalse(recommendations.getRecommendedRecipes().get(0).getAiInsight().contains("Yapay zeka servisine şu an erişilemiyor"));
    }

    @Test
    void shouldRankNutritionByKcalPerServingInsteadOfTotalCalories() {
        user.setDailyCalorieTarget(1500);

        Recipe multiServingFit = Recipe.builder()
                .id(1L)
                .title("Family Fit")
                .averageRating(8.0)
                .ratingCount(1)
                .totalCalories(2000.0)
                .servings(4)
                .recipeIngredients(List.of())
                .build();

        Recipe singleServingHigh = Recipe.builder()
                .id(2L)
                .title("Single High")
                .averageRating(8.0)
                .ratingCount(1)
                .totalCalories(900.0)
                .servings(1)
                .recipeIngredients(List.of())
                .build();

        when(recipeRepository.findTopRecipesSafeForUser(anyString(), anyString(), anyList(), any(Pageable.class)))
                .thenReturn(List.of(singleServingHigh, multiServingFit));

        lenient().when(recipeCompatibilityService.isCompatibleWithDiet(any(), anyString(), any())).thenReturn(true);
        when(ingredientMatchService.calculateMatchScore(any(), anyList())).thenReturn(1.0);

        DailyConsumptionService.DailyNutritionSummary dailySummary = new DailyConsumptionService.DailyNutritionSummary(0, 0, 0.0, 0.0, 0.0);

        Recommendation recommendations = strategy.recommend(user, inventory, dailySummary, "", "FREE", null, Collections.emptyList());

        assertFalse(recommendations.getRecommendedRecipes().isEmpty());
        assertEquals(1L, recommendations.getRecommendedRecipes().get(0).getRecipe().getId());
        assertTrue(recommendations.getRecommendedRecipes().get(0).getAiInsight().contains("Porsiyon başına 500 kcal"));
    }

    @Test
    void shouldHandleTurkishNegativeCravingsInScoring() {
        Recipe withOnion = recipeWithIngredients(10L, "Soganli Corba", 5.0, "Sogan", "Su");
        Recipe withoutOnion = recipeWithIngredients(11L, "Sade Corba", 5.0, "Su");

        when(recipeRepository.findTopRecipesSafeForUser(anyString(), anyString(), anyList(), any(Pageable.class)))
                .thenReturn(List.of(withOnion, withoutOnion));

        lenient().when(recipeCompatibilityService.isCompatibleWithDiet(any(), anyString(), any())).thenReturn(true);
        when(ingredientMatchService.calculateMatchScore(any(), anyList())).thenReturn(1.0);

        when(promptEngine.generatePrompt(anyString(), any(Object[].class))).thenReturn("mock prompt");
        when(promptEngine.callAi(anyString(), anyString(), any())).thenThrow(new RuntimeException("AI unavailable"));

        DailyConsumptionService.DailyNutritionSummary dailySummary = new DailyConsumptionService.DailyNutritionSummary(1500, 10, 150.0, 50.0, 50.0);

        // When: User wants something WITHOUT onion (Turkish data)
        // Note: Using "sogansiz" to match normalized data and testing the score directly
        Recommendation recommendations = strategy.recommend(user, inventory, dailySummary, "soğansız", "gemini", null, Collections.emptyList());

        // Then: Recipe without onion should be first
        assertFalse(recommendations.getRecommendedRecipes().isEmpty());
        assertEquals(11L, recommendations.getRecommendedRecipes().get(0).getRecipe().getId(), "Recipe ID 11 (without onion) should be first");
    }

    @Test
    void shouldPenalizeRecentlyRecommendedRecipes() {
        // Given
        Recipe recentRecipe = Recipe.builder()
                .id(1L)
                .title("Recent Recipe")
                .averageRating(10.0)
                .recipeIngredients(List.of())
                .build();

        Recipe freshRecipe = Recipe.builder()
                .id(2L)
                .title("Fresh Recipe")
                .averageRating(9.5) // Farkı azalttım ki ceza baskın gelsin
                .recipeIngredients(List.of())
                .build();

        when(recipeRepository.findTopRecipesSafeForUser(anyString(), anyString(), anyList(), any(Pageable.class)))
                .thenReturn(List.of(recentRecipe, freshRecipe));

        lenient().when(recipeCompatibilityService.isCompatibleWithDiet(any(), anyString(), any())).thenReturn(true);
        when(ingredientMatchService.calculateMatchScore(any(), anyList())).thenReturn(1.0);

        when(promptEngine.generatePrompt(anyString(), any(Object[].class))).thenReturn("mock prompt");
        when(promptEngine.callAi(anyString(), anyString(), any())).thenThrow(new RuntimeException("AI unavailable"));

        DailyConsumptionService.DailyNutritionSummary dailySummary = new DailyConsumptionService.DailyNutritionSummary(1500, 10, 150.0, 50.0, 50.0);

        // When: Recipe 1 was recently recommended (today)
        List<RecipeUsageHistory> history = List.of(
                new RecipeUsageHistory(1L, LocalDateTime.now(), RecipeUsageHistory.UsageType.RECOMMENDATION)
        );
        Recommendation recommendations = strategy.recommend(user, inventory, dailySummary, "", "gemini", null, history);

        // Then: Fresh recipe (ID 2) should be first despite lower rating because ID 1 is penalized
        assertFalse(recommendations.getRecommendedRecipes().isEmpty());
        assertEquals(2L, recommendations.getRecommendedRecipes().get(0).getRecipe().getId(), "Fresh recipe should be preferred over recently recommended one");
    }

    @Test
    void shouldPenalizeRecentlyConsumedRecipesMoreThanRecommended() {
        // Given
        Recipe consumedRecipe = Recipe.builder()
                .id(1L)
                .title("Consumed Recently")
                .averageRating(10.0)
                .recipeIngredients(List.of())
                .build();

        Recipe recommendedRecipe = Recipe.builder()
                .id(2L)
                .title("Recommended Recently")
                .averageRating(10.0)
                .recipeIngredients(List.of())
                .build();

        when(recipeRepository.findTopRecipesSafeForUser(anyString(), anyString(), anyList(), any(Pageable.class)))
                .thenReturn(List.of(consumedRecipe, recommendedRecipe));

        lenient().when(recipeCompatibilityService.isCompatibleWithDiet(any(), anyString(), any())).thenReturn(true);
        when(ingredientMatchService.calculateMatchScore(any(), anyList())).thenReturn(1.0);

        when(promptEngine.generatePrompt(anyString(), any(Object[].class))).thenReturn("mock prompt");
        when(promptEngine.callAi(anyString(), anyString(), any())).thenThrow(new RuntimeException("AI unavailable"));

        DailyConsumptionService.DailyNutritionSummary dailySummary = new DailyConsumptionService.DailyNutritionSummary(1500, 10, 150.0, 50.0, 50.0);

        // When: Both were used today, but ID 1 was consumed and ID 2 was only recommended
        List<RecipeUsageHistory> history = List.of(
                new RecipeUsageHistory(1L, LocalDateTime.now(), RecipeUsageHistory.UsageType.CONSUMPTION),
                new RecipeUsageHistory(2L, LocalDateTime.now(), RecipeUsageHistory.UsageType.RECOMMENDATION)
        );
        Recommendation recommendations = strategy.recommend(user, inventory, dailySummary, "", "gemini", null, history);

        // Then: Recommended recipe should be above consumed recipe because consumption has higher penalty
        assertFalse(recommendations.getRecommendedRecipes().isEmpty());
        assertEquals(2L, recommendations.getRecommendedRecipes().get(0).getRecipe().getId(), "Recommended recipe should be preferred over recently consumed one");
    }

    @Test
    void shouldDecreasePenaltyAsTimePasses() {
        // Given
        Recipe oldConsumption = Recipe.builder()
                .id(1L)
                .title("Old Consumption")
                .averageRating(9.0)
                .recipeIngredients(List.of())
                .build();

        Recipe recentConsumption = Recipe.builder()
                .id(2L)
                .title("Recent Consumption")
                .averageRating(10.0)
                .recipeIngredients(List.of())
                .build();

        when(recipeRepository.findTopRecipesSafeForUser(anyString(), anyString(), anyList(), any(Pageable.class)))
                .thenReturn(List.of(oldConsumption, recentConsumption));

        lenient().when(recipeCompatibilityService.isCompatibleWithDiet(any(), anyString(), any())).thenReturn(true);
        when(ingredientMatchService.calculateMatchScore(any(), anyList())).thenReturn(1.0);

        when(promptEngine.generatePrompt(anyString(), any(Object[].class))).thenReturn("mock prompt");
        when(promptEngine.callAi(anyString(), anyString(), any())).thenThrow(new RuntimeException("AI unavailable"));

        DailyConsumptionService.DailyNutritionSummary dailySummary = new DailyConsumptionService.DailyNutritionSummary(1500, 10, 150.0, 50.0, 50.0);

        // When: ID 1 was consumed 5 days ago, ID 2 was consumed today
        List<RecipeUsageHistory> history = List.of(
                new RecipeUsageHistory(1L, LocalDateTime.now().minusDays(5), RecipeUsageHistory.UsageType.CONSUMPTION),
                new RecipeUsageHistory(2L, LocalDateTime.now(), RecipeUsageHistory.UsageType.CONSUMPTION)
        );
        Recommendation recommendations = strategy.recommend(user, inventory, dailySummary, "", "gemini", null, history);

        // Then: Old consumption (ID 1) should be above recent consumption (ID 2)
        assertFalse(recommendations.getRecommendedRecipes().isEmpty());
        assertEquals(1L, recommendations.getRecommendedRecipes().get(0).getRecipe().getId(), "Older consumption should be preferred over recent one");
    }
    
    @Test
    void shouldNotPenalizeUncookedRecommendations() {
        // Given
        Recipe uncookedRecipe = Recipe.builder()
                .id(1L)
                .title("Uncooked Recommendation")
                .averageRating(10.0)
                .recipeIngredients(List.of())
                .build();

        Recipe freshRecipe = Recipe.builder()
                .id(2L)
                .title("Fresh Recipe")
                .averageRating(9.0)
                .recipeIngredients(List.of())
                .build();

        when(recipeRepository.findTopRecipesSafeForUser(anyString(), anyString(), anyList(), any(Pageable.class)))
                .thenReturn(List.of(uncookedRecipe, freshRecipe));

        lenient().when(recipeCompatibilityService.isCompatibleWithDiet(any(), anyString(), any())).thenReturn(true);
        when(ingredientMatchService.calculateMatchScore(any(), anyList())).thenReturn(1.0);

        when(promptEngine.generatePrompt(anyString(), any(Object[].class))).thenReturn("mock prompt");
        when(promptEngine.callAi(anyString(), anyString(), any())).thenThrow(new RuntimeException("AI unavailable"));

        DailyConsumptionService.DailyNutritionSummary dailySummary = new DailyConsumptionService.DailyNutritionSummary(1500, 10, 150.0, 50.0, 50.0);

        // When: Recipe 1 was recommended but NOT cooked (so it won't be in the history passed by RecommendationService)
        // Service layer filters it out, so we pass an empty list here to simulate that
        List<RecipeUsageHistory> history = Collections.emptyList();
        
        Recommendation recommendations = strategy.recommend(user, inventory, dailySummary, "", "gemini", null, history);

        // Then: Uncooked recipe should still be first because it's not penalized
        assertFalse(recommendations.getRecommendedRecipes().isEmpty());
        assertEquals(1L, recommendations.getRecommendedRecipes().get(0).getRecipe().getId(), "Uncooked recipe should not be penalized");
    }

    private Recipe recipeWithIngredients(Long id, String title, double rating, String... ingredientNames) {
        List<RecipeIngredient> recipeIngredients = Arrays.stream(ingredientNames)
                .map(name -> RecipeIngredient.builder()
                        .ingredient(Ingredient.builder().name(name).build())
                        .grams(100.0)
                        .build())
                .toList();

        return Recipe.builder()
                .id(id)
                .title(title)
                .averageRating(rating)
                .recipeIngredients(recipeIngredients)
                .build();
    }
}
