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

import java.util.Arrays;
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

        // Mock recipeService.isCompatibleWithDiet to return true
        lenient().when(recipeService.isCompatibleWithDiet(any(), anyString(), any())).thenReturn(true);

        // High Match has 1.0 match score, High Rating has 0.0 match score
        when(ingredientMatchService.calculateMatchScore(eq(highRatingLowMatch), anyList())).thenReturn(0.0);
        when(ingredientMatchService.calculateMatchScore(eq(lowRatingHighMatch), anyList())).thenReturn(1.0);

        when(promptEngine.generatePrompt(anyString(), any(Object[].class))).thenReturn("mock prompt");
        when(promptEngine.callAi(anyString(), anyString())).thenReturn("[{\"recipeTitle\": \"High Match\", \"insight\": \"Great choice!\"}]");

        DailyConsumptionService.DailyNutritionSummary dailySummary = new DailyConsumptionService.DailyNutritionSummary(1500, 10, 150.0, 50.0, 50.0);

        // When
        List<Recipe> recommendations = strategy.recommend(user, inventory, dailySummary, "spicy chicken", "gemini");

        // Then
        assertFalse(recommendations.isEmpty());
        assertEquals(2L, recommendations.get(0).getId());
        assertEquals("Great choice!", recommendations.get(0).getAiInsight());
    }

    @Test
    void shouldDeprioritizeRecipesContainingDislikedIngredientsInFallbackRanking() {
        user.setDislikedIngredients(List.of("Onion"));

        Recipe dislikedRecipe = recipeWithIngredients(1L, "Onion Bowl", 5.0, "Chicken", "Onion");
        Recipe preferredRecipe = recipeWithIngredients(2L, "Herb Bowl", 5.0, "Chicken", "Garlic");

        when(recipeRepository.findTopRecipesSafeForUser(anyString(), anyString(), anyList(), any(Pageable.class)))
                .thenReturn(List.of(dislikedRecipe, preferredRecipe));

        lenient().when(recipeService.isCompatibleWithDiet(any(), anyString(), any())).thenReturn(true);
        when(ingredientMatchService.calculateMatchScore(eq(dislikedRecipe), anyList())).thenReturn(0.8);
        when(ingredientMatchService.calculateMatchScore(eq(preferredRecipe), anyList())).thenReturn(0.8);

        when(promptEngine.generatePrompt(anyString(), any(Object[].class))).thenReturn("mock prompt");
        when(promptEngine.callAi(anyString(), anyString())).thenThrow(new RuntimeException("AI unavailable"));

        DailyConsumptionService.DailyNutritionSummary dailySummary = new DailyConsumptionService.DailyNutritionSummary(1500, 10, 150.0, 50.0,50.0);

        List<Recipe> recommendations = strategy.recommend(user, inventory, dailySummary, "comfort food", "gemini");

        assertFalse(recommendations.isEmpty());
        assertEquals(2L, recommendations.get(0).getId());
    }

    @Test
    void shouldIncludeHardAndSoftConstraintsInPromptContext() {
        user.setAllergies(List.of("Peanut"));
        user.setDislikedIngredients(List.of("Onion"));

        Recipe recipe = recipeWithIngredients(3L, "Balanced Plate", 4.5, "Chicken", "Garlic");

        lenient().when(recipeRepository.findTopRecipesSafeForUser(anyString(), anyString(), anyList(), any(Pageable.class)))
                .thenReturn(List.of(recipe));

        lenient().when(recipeService.isCompatibleWithDiet(any(), anyString(), any())).thenReturn(true);
        lenient().when(ingredientMatchService.calculateMatchScore(eq(recipe), anyList())).thenReturn(1.0);
        lenient().when(promptEngine.generatePrompt(anyString(), any(Object[].class))).thenAnswer(invocation -> {
            String template = invocation.getArgument(0);
            return template + " :: " + Arrays.deepToString(invocation.getArguments());
        });
        lenient().when(promptEngine.callAi(anyString(), anyString())).thenReturn("[]");

        DailyConsumptionService.DailyNutritionSummary dailySummary = new DailyConsumptionService.DailyNutritionSummary(1500, 10, 150.0, 50.0,50.0);

        strategy.recommend(user, inventory, dailySummary, "garlic", "gemini");

        ArgumentCaptor<String> promptCaptor = ArgumentCaptor.forClass(String.class);
        verify(promptEngine).callAi(promptCaptor.capture(), anyString());

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

        lenient().when(recipeService.isCompatibleWithDiet(any(), anyString(), any())).thenReturn(true);
        when(ingredientMatchService.calculateMatchScore(any(), anyList())).thenReturn(1.0);

        when(promptEngine.generatePrompt(anyString(), any(Object[].class))).thenReturn("mock prompt");
        when(promptEngine.callAi(anyString(), anyString())).thenThrow(new RuntimeException("AI unavailable"));

        DailyConsumptionService.DailyNutritionSummary dailySummary = new DailyConsumptionService.DailyNutritionSummary(1500, 10, 150.0, 50.0, 50.0);

        // When: User wants something WITHOUT onion (English data)
        List<Recipe> recommendations = strategy.recommend(user, inventory, dailySummary, "onion-free meal", "gemini");

        // Then: Recipe without onion should be first
        assertFalse(recommendations.isEmpty());
        assertEquals(11L, recommendations.get(0).getId());
        assertTrue(recommendations.get(0).getAiInsight().contains("Yapay zeka servisine şu an erişilemiyor"));
    }

    @Test
    void shouldHandleTurkishNegativeCravingsInScoring() {
        Recipe withOnion = recipeWithIngredients(10L, "Soganli Corba", 5.0, "Sogan", "Su");
        Recipe withoutOnion = recipeWithIngredients(11L, "Sade Corba", 5.0, "Su");

        when(recipeRepository.findTopRecipesSafeForUser(anyString(), anyString(), anyList(), any(Pageable.class)))
                .thenReturn(List.of(withOnion, withoutOnion));

        lenient().when(recipeService.isCompatibleWithDiet(any(), anyString(), any())).thenReturn(true);
        when(ingredientMatchService.calculateMatchScore(any(), anyList())).thenReturn(1.0);

        when(promptEngine.generatePrompt(anyString(), any(Object[].class))).thenReturn("mock prompt");
        when(promptEngine.callAi(anyString(), anyString())).thenThrow(new RuntimeException("AI unavailable"));

        DailyConsumptionService.DailyNutritionSummary dailySummary = new DailyConsumptionService.DailyNutritionSummary(1500, 10, 150.0, 50.0, 50.0);

        // When: User wants something WITHOUT onion (Turkish data)
        // Note: Using "sogansiz" to match normalized data and testing the score directly
        List<Recipe> recommendations = strategy.recommend(user, inventory, dailySummary, "soğansız", "gemini");

        // Then: Recipe without onion should be first
        assertFalse(recommendations.isEmpty());
        assertEquals(11L, recommendations.get(0).getId(), "Recipe ID 11 (without onion) should be first");
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
