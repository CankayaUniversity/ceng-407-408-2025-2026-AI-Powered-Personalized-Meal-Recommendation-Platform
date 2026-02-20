package com.mealapp.domain.recipe.service;

import com.mealapp.domain.common.exception.ResourceNotFoundException;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.entity.RecipeRating;
import com.mealapp.domain.recipe.repository.RecipeRatingRepository;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.user.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RecipeRatingServiceTest {

    @Mock
    private RecipeRatingRepository recipeRatingRepository;

    @Mock
    private RecipeService recipeService;

    @Mock
    private UserService userService;

    @InjectMocks
    private RecipeRatingService recipeRatingService;

    private User user;
    private Recipe recipe;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).name("Test User").build();
        recipe = Recipe.builder().id(1L).title("Test Recipe").build();
    }

    @Test
    void rateRecipe_WhenNewRating_ShouldSave() {
        // Given
        Long userId = 1L;
        Long recipeId = 1L;
        Integer ratingValue = 8;
        String comment = "Harika!";

        when(userService.findById(userId)).thenReturn(Optional.of(user));
        when(recipeService.findById(recipeId)).thenReturn(Optional.of(recipe));
        when(recipeRatingRepository.findByUserIdAndRecipeId(userId, recipeId)).thenReturn(Collections.emptyList());
        when(recipeRatingRepository.save(any(RecipeRating.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        RecipeRating savedRating = recipeRatingService.rateRecipe(userId, recipeId, ratingValue, comment);

        // Then
        assertNotNull(savedRating);
        assertEquals(ratingValue, savedRating.getRating());
        assertEquals(comment, savedRating.getComment());
        assertEquals(user, savedRating.getUser());
        assertEquals(recipe, savedRating.getRecipe());
        verify(recipeRatingRepository).save(any(RecipeRating.class));
    }

    @Test
    void rateRecipe_WhenInvalidRating_ShouldThrowException() {
        // When & Then
        assertThrows(IllegalArgumentException.class, () -> 
            recipeRatingService.rateRecipe(1L, 1L, 11, "Çok iyi")
        );
        
        assertThrows(IllegalArgumentException.class, () -> 
            recipeRatingService.rateRecipe(1L, 1L, 0, "Kötü")
        );
    }

    @Test
    void rateRecipe_WhenUserNotFound_ShouldThrowException() {
        when(userService.findById(1L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> 
            recipeRatingService.rateRecipe(1L, 1L, 5, "Not")
        );
    }

    @Test
    void getRatingsByRecipe_ShouldReturnList() {
        when(recipeRatingRepository.findByRecipeId(1L)).thenReturn(Collections.emptyList());

        List<RecipeRating> ratings = recipeRatingService.getRatingsByRecipe(1L);

        assertNotNull(ratings);
        verify(recipeRatingRepository).findByRecipeId(1L);
    }
}
