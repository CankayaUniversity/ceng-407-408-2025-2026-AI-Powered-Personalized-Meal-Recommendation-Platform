package com.mealapp.app.service;

import com.mealapp.app.model.dto.recommendation.MenuRecommendationHistoryResponse;
import com.mealapp.app.model.dto.recommendation.MenuRecommendationRequest;
import com.mealapp.app.model.dto.recommendation.MenuRecommendationResponse;
import com.mealapp.app.model.dto.recommendation.RecommendationRequest;
import com.mealapp.app.model.dto.recommendation.RecommendationResponse;
import com.mealapp.app.model.mapper.recommendation.RecommendationMapper;
import com.mealapp.domain.inventory.service.InventoryService;
import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.entity.RecipeCategory;
import com.mealapp.domain.recipe.repository.IngredientRepository;
import com.mealapp.domain.recipe.service.RecipeRatingService;
import com.mealapp.domain.recommendation.dto.MenuRecommendationResult;
import com.mealapp.domain.recommendation.entity.Recommendation;
import com.mealapp.domain.recommendation.entity.RecommendationMenu;
import com.mealapp.domain.recommendation.entity.RecommendationMenuCourse;
import com.mealapp.domain.recommendation.entity.RecommendedRecipe;
import com.mealapp.domain.recommendation.repository.RecommendationRepository;
import com.mealapp.domain.recommendation.repository.RecommendedRecipeRepository;
import com.mealapp.domain.recommendation.service.IngredientMatchService;
import com.mealapp.domain.recommendation.service.RecommendationService;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.user.service.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecommendationAppServiceTest {

    @Mock
    private RecommendationService recommendationService;
    @Mock
    private UserService userService;
    @Mock
    private IngredientRepository ingredientRepository;
    @Mock
    private InventoryService inventoryService;
    @Mock
    private RecommendationMapper recommendationMapper;
    @Mock
    private RecommendationRepository recommendationRepository;
    @Mock
    private RecommendedRecipeRepository recommendedRecipeRepository;
    @Mock
    private RecipeRatingService recipeRatingService;
    @Mock
    private IngredientMatchService ingredientMatchService;

    @InjectMocks
    private RecommendationAppService recommendationAppService;

    @Test
    void shouldGetRecommendations() {
        RecommendationRequest request = new RecommendationRequest();
        request.setUserId("user-1");
        request.setAvailableIngredients(List.of("Tomato", "Onion", "Tomato"));
        request.setDislikedIngredients(List.of("Cilantro", " cilantro "));
        request.setCravings("Something spicy");

        User user = User.builder().id("user-1").build();
        when(userService.findById("user-1")).thenReturn(Optional.of(user));
        when(ingredientRepository.findByNameIgnoreCase(any())).thenReturn(Optional.empty());
        Recommendation recommendation = new Recommendation();
        when(recommendationService.getRecommendations(any(), anyList(), any(), any(), any())).thenReturn(recommendation);
        when(recommendationMapper.toResponse(any(), anyList())).thenReturn(new RecommendationResponse());

        RecommendationResponse response = recommendationAppService.getRecommendations(request);

        assertNotNull(response);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(recommendationService).getRecommendations(userCaptor.capture(), anyList(), eq("Something spicy"), any(), any());
        assertEquals(List.of("Cilantro"), userCaptor.getValue().getDislikedIngredients());
    }
    @Test
    void shouldRateRecommendation() {
        // Given
        String userId = "user-1";
        Long rrId = 1L;
        Long recipeId = 100L;
        Integer rating = 9;
        String comment = "Great!";

        Recipe recipe = Recipe.builder().id(recipeId).build();
        RecommendedRecipe rr = RecommendedRecipe.builder()
                .id(rrId)
                .recipe(recipe)
                .build();

        when(recommendedRecipeRepository.findById(rrId)).thenReturn(Optional.of(rr));

        // When
        recommendationAppService.rateRecommendation(userId, rrId, rating, comment);

        // Then
        assertEquals(9, rr.getUserRating());
        assertEquals(comment, rr.getUserComment());
        verify(recipeRatingService).rateRecipe(userId, recipeId, 9, comment);
        verify(recommendedRecipeRepository).save(rr);
    }

    @Test
    void shouldPersistMenuAlternativesAndCourses() {
        User user = User.builder().id("user-1").build();
        Recipe soup = Recipe.builder().id(1L).title("Soup").servings(1).build();
        Recipe main = Recipe.builder().id(2L).title("Main").servings(1).build();

        MenuRecommendationRequest request = new MenuRecommendationRequest();
        request.setInventoryGroupId(10L);
        request.setSelectedCategories(List.of(RecipeCategory.CORBALAR, RecipeCategory.ANA_YEMEKLER));
        request.setAiModel("FREE");

        MenuRecommendationResult result = MenuRecommendationResult.builder()
                .aiGenerated(false)
                .menus(List.of(
                        menu(1, soup, main),
                        menu(2, soup, main),
                        menu(3, soup, main)
                ))
                .build();

        when(userService.findById("user-1")).thenReturn(Optional.of(user));
        when(inventoryService.getUserInventory("user-1", 10L)).thenReturn(List.of());
        when(recommendationService.getMenuRecommendations(eq(user), anyList(), eq(request.getSelectedCategories()), any(), eq("FREE"), any()))
                .thenReturn(result);
        when(recommendationRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(ingredientMatchService.getMatchedIngredientNames(any(), anyList())).thenReturn(List.of());
        when(ingredientMatchService.getMissingIngredientNames(any(), anyList())).thenReturn(List.of());

        MenuRecommendationResponse response = recommendationAppService.getMenuRecommendations("user-1", request);

        assertEquals(3, response.getMenus().size());

        ArgumentCaptor<Recommendation> recommendationCaptor = ArgumentCaptor.forClass(Recommendation.class);
        verify(recommendationRepository).save(recommendationCaptor.capture());
        Recommendation savedRecommendation = recommendationCaptor.getValue();
        assertEquals(2, savedRecommendation.getRecommendedRecipes().size());
        assertEquals(3, savedRecommendation.getMenus().size());
        assertEquals(2, savedRecommendation.getMenus().get(0).getCourses().size());
    }

    @Test
    void shouldReturnMenuHistoryWithPersistedMenus() {
        Recipe recipe = Recipe.builder().id(1L).title("Soup").servings(1).totalCookCount(4).build();
        RecommendedRecipe recommendedRecipe = RecommendedRecipe.builder()
                .id(11L)
                .recipe(recipe)
                .build();
        recommendedRecipe.setCooked(true);

        RecommendationMenu menu = RecommendationMenu.builder()
                .rank(1)
                .title("Menu 1")
                .totalKcal(300.0)
                .build();
        menu.addCourse(RecommendationMenuCourse.builder()
                .category(RecipeCategory.CORBALAR)
                .recommendedRecipe(recommendedRecipe)
                .build());

        Recommendation recommendation = Recommendation.builder()
                .id(100L)
                .aiModel("FREE")
                .isAiGenerated(false)
                .build();
        recommendation.addRecommendedRecipe(recommendedRecipe);
        recommendation.addMenu(menu);

        when(recommendationService.getRecommendationHistory("user-1")).thenReturn(List.of(recommendation));
        when(inventoryService.getUserInventory("user-1")).thenReturn(List.of());
        when(ingredientMatchService.getMatchedIngredientNames(any(), anyList())).thenReturn(List.of());
        when(ingredientMatchService.getMissingIngredientNames(any(), anyList())).thenReturn(List.of("Lentil"));

        List<MenuRecommendationHistoryResponse> history = recommendationAppService.getMenuRecommendationHistory("user-1");

        assertEquals(1, history.size());
        assertEquals(1, history.get(0).getMenus().size());
        MenuRecommendationResponse.MenuCourseRecipeDto course = history.get(0).getMenus().get(0).getCourses().get(RecipeCategory.CORBALAR);
        assertNotNull(course);
        assertEquals(11L, course.getRecommendationRecipeId());
        assertTrue(course.isCooked());
        assertEquals(4, course.getTotalCookCount());
    }

    @Test
    void shouldSkipLegacyRecommendationsInMenuHistory() {
        Recommendation legacyRecommendation = Recommendation.builder().id(100L).build();

        when(recommendationService.getRecommendationHistory("user-1")).thenReturn(List.of(legacyRecommendation));
        when(inventoryService.getUserInventory("user-1")).thenReturn(List.of());

        List<MenuRecommendationHistoryResponse> history = recommendationAppService.getMenuRecommendationHistory("user-1");

        assertTrue(history.isEmpty());
    }

    private MenuRecommendationResult.MenuAlternative menu(int rank, Recipe soup, Recipe main) {
        return MenuRecommendationResult.MenuAlternative.builder()
                .rank(rank)
                .title("Menu " + rank)
                .courses(Map.of(
                        RecipeCategory.CORBALAR, soup,
                        RecipeCategory.ANA_YEMEKLER, main
                ))
                .insight("Balanced menu")
                .totalKcal(500.0)
                .totalProtein(30.0)
                .totalCarbs(40.0)
                .totalFat(20.0)
                .totalPreparationTime(45)
                .build();
    }
}
