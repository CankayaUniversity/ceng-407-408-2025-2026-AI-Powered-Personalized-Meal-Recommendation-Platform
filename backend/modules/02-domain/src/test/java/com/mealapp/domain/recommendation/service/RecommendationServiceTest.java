package com.mealapp.domain.recommendation.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mealapp.domain.common.ai.PromptEngine;
import com.mealapp.domain.common.exception.MealAppDomainException;
import com.mealapp.domain.consumption.entity.DailyConsumption;
import com.mealapp.domain.consumption.service.DailyConsumptionService;
import com.mealapp.domain.inventory.entity.Inventory;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.entity.RecipeCategory;
import com.mealapp.domain.recipe.repository.RecipeRepository;
import com.mealapp.domain.recipe.service.RecipeService;
import com.mealapp.domain.recommendation.dto.MenuRecommendationResult;
import com.mealapp.domain.recommendation.dto.RecipeUsageHistory;
import com.mealapp.domain.recommendation.entity.Recommendation;
import com.mealapp.domain.recommendation.entity.RecommendedRecipe;
import com.mealapp.domain.recommendation.repository.RecommendationRepository;
import com.mealapp.domain.recommendation.strategy.RecommendationStrategy;
import com.mealapp.domain.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecommendationServiceTest {

        @Mock
        private RecipeService recipeService;
        @Mock
        private DailyConsumptionService dailyConsumptionService;
        @Mock
        private RecommendationStrategy aiRecommendationStrategy;
        @Mock
        private RecommendationRepository recommendationRepository;
        @Mock
        private RecipeRepository recipeRepository;
        @Mock
        private RecipeCompatibilityService recipeCompatibilityService;
        @Mock
        private IngredientMatchService ingredientMatchService;
        @Mock
        private PromptEngine promptEngine;
        @Spy
        private ObjectMapper objectMapper = new ObjectMapper();

        @InjectMocks
        private RecommendationService recommendationService;

        private User user;

        @BeforeEach
        void setUp() {
                user = User.builder()
                                .id("user-1")
                                .name("Test User")
                                .dietType(User.DietType.NONE)
                                .dailyCalorieTarget(2100)
                                .build();
        }

        @Test
        void getRecommendationsShouldDelegateToStrategyWithDailySummaryAndHistory() {
                DailyConsumptionService.DailyNutritionSummary summary = new DailyConsumptionService.DailyNutritionSummary(
                                1200, 2, 80.0, 130.0, 40.0);
                Recipe recommendedRecipe = recipe(1L, "Lentil Soup", RecipeCategory.CORBALAR);
                Recommendation strategyRecommendation = recommendationWithRecipe(user, recommendedRecipe);

                Recipe previouslyRecommendedRecipe = recipe(2L, "Old Pasta", RecipeCategory.ANA_YEMEKLER);
                Recommendation previousRecommendation = recommendationWithCookedRecipe(user,
                                previouslyRecommendedRecipe);
                previousRecommendation.setCreatedAt(LocalDateTime.of(2026, 5, 25, 12, 0));

                Recipe consumedRecipe = recipe(3L, "Consumed Salad", RecipeCategory.SALATALAR_VE_MEZELER);
                DailyConsumption consumption = DailyConsumption.builder()
                                .user(user)
                                .foodName("Consumed Salad")
                                .recipe(consumedRecipe)
                                .consumedAt(LocalDateTime.of(2026, 5, 24, 19, 0))
                                .build();

                when(dailyConsumptionService.getDailyNutritionSummary(eq(user.getId()), any(LocalDate.class)))
                                .thenReturn(summary);
                when(recommendationRepository.findByUserIdOrderByCreatedAtDesc(eq(user.getId()),
                                eq(PageRequest.of(0, 3))))
                                .thenReturn(List.of(previousRecommendation));
                when(dailyConsumptionService.getConsumptionsBetween(eq(user.getId()), any(LocalDate.class),
                                any(LocalDate.class)))
                                .thenReturn(List.of(consumption));
                when(aiRecommendationStrategy.recommend(eq(user), eq(List.of()), eq(summary), eq("warm soup"),
                                eq("gemini"), eq("key"), anyList()))
                                .thenReturn(strategyRecommendation);
                when(recommendationRepository.save(strategyRecommendation)).thenReturn(strategyRecommendation);

                Recommendation result = recommendationService.getRecommendations(user, null, "warm soup", "gemini",
                                "key");

                assertSame(strategyRecommendation, result);
                verify(recipeService).calculateAndSetNutrition(recommendedRecipe);
                verify(recommendationRepository).save(strategyRecommendation);

                @SuppressWarnings("unchecked")
                ArgumentCaptor<List<RecipeUsageHistory>> historyCaptor = ArgumentCaptor.forClass(List.class);
                verify(aiRecommendationStrategy).recommend(eq(user), eq(List.of()), eq(summary), eq("warm soup"),
                                eq("gemini"), eq("key"), historyCaptor.capture());

                List<RecipeUsageHistory> history = historyCaptor.getValue();
                assertEquals(2, history.size());
                assertEquals(2L, history.get(0).getRecipeId());
                assertEquals(RecipeUsageHistory.UsageType.RECOMMENDATION, history.get(0).getType());
                assertEquals(3L, history.get(1).getRecipeId());
                assertEquals(RecipeUsageHistory.UsageType.CONSUMPTION, history.get(1).getType());
        }

        @Test
        void getRecommendationHistoryShouldUseLatest100Recommendations() {
                Recommendation recommendation = Recommendation.builder().user(user).build();
                when(recommendationRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), PageRequest.of(0, 100)))
                                .thenReturn(List.of(recommendation));

                List<Recommendation> result = recommendationService.getRecommendationHistory(user.getId());

                assertEquals(List.of(recommendation), result);
                verify(recommendationRepository).findByUserIdOrderByCreatedAtDesc(user.getId(), PageRequest.of(0, 100));
        }

        @Test
        void getMenuRecommendationsShouldRejectMissingUser() {
                MealAppDomainException missingUser = assertThrows(MealAppDomainException.class, () -> recommendationService.getMenuRecommendations(null,
                                List.of(), List.of(RecipeCategory.CORBALAR), "", "FREE", null));
                assertEquals("domain.auth.user_missing", missingUser.getMessageCode());

                User blankIdUser = User.builder().id(" ").build();
                MealAppDomainException blankUser = assertThrows(MealAppDomainException.class,
                                () -> recommendationService.getMenuRecommendations(blankIdUser, List.of(),
                                                List.of(RecipeCategory.CORBALAR), "", "FREE", null));
                assertEquals("domain.auth.user_missing", blankUser.getMessageCode());
        }

        @Test
        void getMenuRecommendationsShouldRejectEmptyCategories() {
                MealAppDomainException missingCategories = assertThrows(MealAppDomainException.class, () -> recommendationService.getMenuRecommendations(user,
                                List.of(), null, "", "FREE", null));
                assertEquals("domain.recommendation.menu_categories_required", missingCategories.getMessageCode());

                MealAppDomainException nullCategories = assertThrows(MealAppDomainException.class, () -> recommendationService.getMenuRecommendations(user,
                                List.of(), Arrays.asList(null, null), "", "FREE", null));
                assertEquals("domain.recommendation.menu_categories_required", nullCategories.getMessageCode());
        }

        @Test
        void getMenuRecommendationsWithFreeModelShouldBuildFallbackMenusWithoutCallingAi() {
                Recipe soup = recipe(10L, "Tomato Soup", RecipeCategory.CORBALAR);
                Recipe main = recipe(20L, "Rice Bowl", RecipeCategory.ANA_YEMEKLER);
                Inventory inventory = Inventory.builder().quantity(1.0).unit("GRAM").build();

                when(recommendationRepository.findByUserIdOrderByCreatedAtDesc(eq(user.getId()),
                                eq(PageRequest.of(0, 3))))
                                .thenReturn(List.of());
                when(dailyConsumptionService.getConsumptionsBetween(eq(user.getId()), any(LocalDate.class),
                                any(LocalDate.class)))
                                .thenReturn(List.of());
                when(recipeRepository.findMenuCandidatesForUser(eq(user.getId()), eq(RecipeCategory.CORBALAR), eq(null),
                                eq(List.of("__mealai_no_allergy__")), any(Pageable.class)))
                                .thenReturn(List.of(soup));
                when(recipeRepository.findMenuCandidatesForUser(eq(user.getId()), eq(RecipeCategory.ANA_YEMEKLER),
                                eq(null), eq(List.of("__mealai_no_allergy__")), any(Pageable.class)))
                                .thenReturn(List.of(main));
                when(recipeCompatibilityService.isCompatibleWithDiet(any(Recipe.class), eq(User.DietType.NONE.name()),
                                eq(null)))
                                .thenReturn(true);
                when(ingredientMatchService.calculateMatchScore(any(Recipe.class), eq(List.of(inventory))))
                                .thenReturn(0.75);

                MenuRecommendationResult result = recommendationService.getMenuRecommendations(
                                user,
                                Arrays.asList(inventory, null),
                                Arrays.asList(RecipeCategory.CORBALAR, null, RecipeCategory.ANA_YEMEKLER,
                                                RecipeCategory.CORBALAR),
                                "comfort",
                                "FREE",
                                null);

                assertFalse(result.isAiGenerated());
                assertEquals(3, result.getMenus().size());
                assertEquals("Recommended Menu 1 (Favorite)", result.getMenus().get(0).getTitle());
                assertEquals(List.of(RecipeCategory.CORBALAR, RecipeCategory.ANA_YEMEKLER),
                                new ArrayList<>(result.getMenus().get(0).getCourses().keySet()));
                assertSame(soup, result.getMenus().get(0).getCourses().get(RecipeCategory.CORBALAR));
                assertSame(main, result.getMenus().get(0).getCourses().get(RecipeCategory.ANA_YEMEKLER));

                verify(recipeService).calculateAndSetNutrition(soup);
                verify(recipeService).calculateAndSetNutrition(main);
                verifyNoInteractions(promptEngine);
        }

        @Test
        void getMenuRecommendationsShouldSanitizeValidateAndUseAiMenus() {
                Recipe soup = recipe(10L, "Tomato Soup", RecipeCategory.CORBALAR);
                Recipe main = recipe(20L, "Rice Bowl", RecipeCategory.ANA_YEMEKLER);

                mockMenuCandidates(soup, main);
                when(dailyConsumptionService.getDailyNutritionSummary(eq(user.getId()), any(LocalDate.class)))
                                .thenReturn(new DailyConsumptionService.DailyNutritionSummary(300, 1, 20.0, 30.0,
                                                10.0));
                when(promptEngine.callAi(anyString(), eq("GEMINI"), eq("key")))
                                .thenReturn("""
                                                Here is the menu:
                                                ```json
                                                [{"rank":1,"title":"Balanced AI Menu","courseRecipeIds":{"CORBALAR":10,"ANA_YEMEKLER":20},"insight":"Fits your pantry."}]
                                                ```
                                                """);

                MenuRecommendationResult result = recommendationService.getMenuRecommendations(
                                user,
                                List.of(),
                                List.of(RecipeCategory.CORBALAR, RecipeCategory.ANA_YEMEKLER),
                                "comfort",
                                "GEMINI",
                                "key");

                assertTrue(result.isAiGenerated());
                assertEquals(3, result.getMenus().size());
                assertEquals("Balanced AI Menu", result.getMenus().get(0).getTitle());
                assertSame(soup, result.getMenus().get(0).getCourses().get(RecipeCategory.CORBALAR));
                assertSame(main, result.getMenus().get(0).getCourses().get(RecipeCategory.ANA_YEMEKLER));

                ArgumentCaptor<String> promptCaptor = ArgumentCaptor.forClass(String.class);
                verify(promptEngine).callAi(promptCaptor.capture(), eq("GEMINI"), eq("key"));
                assertTrue(promptCaptor.getValue().contains("Output ONLY valid JSON"));
        }

        @Test
        void getMenuRecommendationsShouldFallbackWhenAiMenuSchemaIsIncomplete() {
                Recipe soup = recipe(10L, "Tomato Soup", RecipeCategory.CORBALAR);
                Recipe main = recipe(20L, "Rice Bowl", RecipeCategory.ANA_YEMEKLER);

                mockMenuCandidates(soup, main);
                when(dailyConsumptionService.getDailyNutritionSummary(eq(user.getId()), any(LocalDate.class)))
                                .thenReturn(new DailyConsumptionService.DailyNutritionSummary(300, 1, 20.0, 30.0,
                                                10.0));
                when(promptEngine.callAi(anyString(), eq("GEMINI"), eq("key")))
                                .thenReturn("[{\"rank\":1,\"title\":\"Incomplete\",\"courseRecipeIds\":{\"CORBALAR\":10},\"insight\":\"Missing one category.\"}]");

                MenuRecommendationResult result = recommendationService.getMenuRecommendations(
                                user,
                                List.of(),
                                List.of(RecipeCategory.CORBALAR, RecipeCategory.ANA_YEMEKLER),
                                "comfort",
                                "GEMINI",
                                "key");

                assertFalse(result.isAiGenerated());
                assertEquals(3, result.getMenus().size());
                assertEquals("Recommended Menu 1 (Favorite)", result.getMenus().get(0).getTitle());
                assertSame(soup, result.getMenus().get(0).getCourses().get(RecipeCategory.CORBALAR));
                assertSame(main, result.getMenus().get(0).getCourses().get(RecipeCategory.ANA_YEMEKLER));
        }

        private void mockMenuCandidates(Recipe soup, Recipe main) {
                when(recommendationRepository.findByUserIdOrderByCreatedAtDesc(eq(user.getId()),
                                eq(PageRequest.of(0, 3))))
                                .thenReturn(List.of());
                when(dailyConsumptionService.getConsumptionsBetween(eq(user.getId()), any(LocalDate.class),
                                any(LocalDate.class)))
                                .thenReturn(List.of());
                when(recipeRepository.findMenuCandidatesForUser(eq(user.getId()), eq(RecipeCategory.CORBALAR), eq(null),
                                eq(List.of("__mealai_no_allergy__")), any(Pageable.class)))
                                .thenReturn(List.of(soup));
                when(recipeRepository.findMenuCandidatesForUser(eq(user.getId()), eq(RecipeCategory.ANA_YEMEKLER),
                                eq(null), eq(List.of("__mealai_no_allergy__")), any(Pageable.class)))
                                .thenReturn(List.of(main));
                when(recipeCompatibilityService.isCompatibleWithDiet(any(Recipe.class), eq(User.DietType.NONE.name()),
                                eq(null)))
                                .thenReturn(true);
                when(ingredientMatchService.calculateMatchScore(any(Recipe.class), anyList())).thenReturn(0.75);
        }

        private static Recipe recipe(Long id, String title, RecipeCategory category) {
                return Recipe.builder()
                                .id(id)
                                .title(title)
                                .category(category)
                                .servings(2)
                                .totalCalories(600.0)
                                .totalProtein(30.0)
                                .totalCarbs(80.0)
                                .totalFat(20.0)
                                .preparationTimeMinutes(25)
                                .recipeIngredients(List.of())
                                .build();
        }

        private static Recommendation recommendationWithRecipe(User user, Recipe recipe) {
                Recommendation recommendation = Recommendation.builder()
                                .user(user)
                                .recommendedRecipes(new ArrayList<>())
                                .build();
                recommendation.addRecommendedRecipe(RecommendedRecipe.builder()
                                .recipe(recipe)
                                .aiInsight("Good fit")
                                .build());
                return recommendation;
        }

        private static Recommendation recommendationWithCookedRecipe(User user, Recipe recipe) {
                Recommendation recommendation = recommendationWithRecipe(user, recipe);
                recommendation.getRecommendedRecipes().getFirst().setCooked(true);
                return recommendation;
        }
}
