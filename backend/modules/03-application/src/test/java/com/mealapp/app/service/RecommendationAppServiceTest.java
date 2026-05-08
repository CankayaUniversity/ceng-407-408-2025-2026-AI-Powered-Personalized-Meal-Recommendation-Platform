package com.mealapp.app.service;

import com.mealapp.app.model.dto.recommendation.RecommendationRequest;
import com.mealapp.app.model.dto.recommendation.RecommendationResponse;
import com.mealapp.app.model.mapper.recommendation.RecommendationMapper;
import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.repository.IngredientRepository;
import com.mealapp.domain.recipe.service.RecipeRatingService;
import com.mealapp.domain.recommendation.entity.Recommendation;
import com.mealapp.domain.recommendation.entity.RecommendedRecipe;
import com.mealapp.domain.recommendation.repository.RecommendedRecipeRepository;
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
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
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
    private RecommendationMapper recommendationMapper;
    @Mock
    private RecommendedRecipeRepository recommendedRecipeRepository;
    @Mock
    private RecipeRatingService recipeRatingService;

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
        when(recommendationService.getRecommendations(any(), anyList(), any(), any())).thenReturn(recommendation);
        when(recommendationMapper.toResponse(any(), anyList())).thenReturn(new RecommendationResponse());

        RecommendationResponse response = recommendationAppService.getRecommendations(request);

        assertNotNull(response);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(recommendationService).getRecommendations(userCaptor.capture(), anyList(), eq("Something spicy"), any());
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
}
