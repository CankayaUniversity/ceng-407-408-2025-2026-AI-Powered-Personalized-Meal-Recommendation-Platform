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
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

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
        inventory = List.of(Inventory.builder().ingredient(chicken).user(user).build());
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

        when(recipeRepository.findTopRecipesSafeForUser(anyString(), anyList(), any(Pageable.class)))
                .thenReturn(List.of(highRatingLowMatch, lowRatingHighMatch));

        // Mock recipeService.isCompatibleWithDiet to return true
        lenient().when(recipeService.isCompatibleWithDiet(any(), anyString(), any())).thenReturn(true);

        // High Match has 1.0 match score, High Rating has 0.0 match score
        when(ingredientMatchService.calculateMatchScore(eq(highRatingLowMatch), anyList())).thenReturn(0.0);
        when(ingredientMatchService.calculateMatchScore(eq(lowRatingHighMatch), anyList())).thenReturn(1.0);

        when(promptEngine.generatePrompt(anyString(), any(Object[].class))).thenReturn("mock prompt");
        when(promptEngine.callAi(anyString())).thenReturn("[{\"recipeTitle\": \"High Match\", \"insight\": \"Great choice!\"}]");

        DailyConsumptionService.DailyNutritionSummary dailySummary = new DailyConsumptionService.DailyNutritionSummary(1500, 100.0, 150.0, 50.0);

        // When
        List<Recipe> recommendations = strategy.recommend(user, inventory, dailySummary);

        // Then
        // High Match Score: (1.0 * 0.7) + (0.2 * 0.3) = 0.7 + 0.06 = 0.76
        // High Rating Score: (0.0 * 0.7) + (1.0 * 0.3) = 0.3
        // So High Match (ID 2) should be first
        assertFalse(recommendations.isEmpty());
        assertEquals(2L, recommendations.get(0).getId());
        assertEquals("Great choice!", recommendations.get(0).getAiInsight());
    }
}
