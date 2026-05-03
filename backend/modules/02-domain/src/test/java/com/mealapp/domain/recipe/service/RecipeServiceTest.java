package com.mealapp.domain.recipe.service;

import com.mealapp.domain.notification.service.NotificationService;
import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.entity.IngredientNutrition;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.entity.RecipeIngredient;
import com.mealapp.domain.recipe.repository.IngredientRepository;
import com.mealapp.domain.recipe.repository.RecipeRepository;
import com.mealapp.domain.recipe.entity.RecipeStatus;
import com.mealapp.domain.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecipeServiceTest {

    @Mock
    private RecipeRepository recipeRepository;

    @Mock
    private IngredientRepository ingredientRepository;

    @Mock
    private UnitConverterService unitConverterService;

    @Mock
    private com.mealapp.domain.common.storage.FileStorageService fileStorageService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private RecipeService recipeService;

    @Test
    void shouldCalculateNutritionWhenTotalCaloriesIsZero() {
        IngredientNutrition nutrition = IngredientNutrition.builder()
                .caloriesPer100g(200.0)
                .proteinPer100g(10.0)
                .carbsPer100g(20.0)
                .fatPer100g(5.0)
                .build();
        Ingredient ingredient = Ingredient.builder().name("Test").nutrition(nutrition).build();
        RecipeIngredient ri = RecipeIngredient.builder().ingredient(ingredient).grams(200.0).build();
        Recipe recipe = Recipe.builder().id(1L).recipeIngredients(List.of(ri)).totalCalories(0.0).build();

        when(recipeRepository.findByIdWithIngredients(1L)).thenReturn(Optional.of(recipe));
        
        Optional<Recipe> result = recipeService.findById(1L);
        
        assertEquals(400.0, result.get().getTotalCalories());
        assertEquals(20.0, result.get().getTotalProtein());
        assertEquals(40.0, result.get().getTotalCarbs());
        assertEquals(10.0, result.get().getTotalFat());
    }

    @Test
    void shouldFindAllWithIngredients() {
        when(recipeRepository.findAll()).thenReturn(List.of(new Recipe()));
        
        List<Recipe> result = recipeService.findAll();
        
        assertEquals(1, result.size());
    }

    @Test
    void shouldUpdateRecipeWithIngredientId() {
        Long recipeId = 1L;
        String userId = "user123";
        Recipe existingRecipe = Recipe.builder()
            .id(recipeId)
            .title("Old Title")
            .createdBy(userId)
            .status(RecipeStatus.DRAFT)
            .build();

        Recipe updatedData = Recipe.builder()
            .title("New Title")
            .status(RecipeStatus.PENDING)
            .build();

        Ingredient ingredient = Ingredient.builder().id(10L).name("Tomato").build();
        RecipeIngredient ri = RecipeIngredient.builder()
            .ingredient(Ingredient.builder().id(10L).build())
            .amount(2.0)
            .unit("piece")
            .build();

        when(recipeRepository.findById(recipeId)).thenReturn(Optional.of(existingRecipe));
        when(ingredientRepository.findByIdAndActiveTrue(10L)).thenReturn(Optional.of(ingredient));
        when(recipeRepository.save(any(Recipe.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Recipe result = recipeService.updateRecipe(recipeId, updatedData, List.of(ri), userId);

        assertNotNull(result);
        assertEquals("New Title", result.getTitle());
        assertEquals(RecipeStatus.PENDING, result.getStatus());
        assertEquals(1, result.getRecipeIngredients().size());
        assertEquals(10L, result.getRecipeIngredients().get(0).getIngredient().getId());
        verify(recipeRepository, org.mockito.Mockito.atLeastOnce()).save(any(Recipe.class));
    }

    @Test
    void shouldUpdateRecipeWithEmptyIngredients() {
        Long recipeId = 1L;
        String userId = "user123";
        Recipe existingRecipe = Recipe.builder()
            .id(recipeId)
            .title("Old Title")
            .createdBy(userId)
            .status(RecipeStatus.DRAFT)
            .build();

        Recipe updatedData = Recipe.builder()
            .title("New Title")
            .instructions("New Instructions")
            .status(RecipeStatus.DRAFT)
            .build();

        when(recipeRepository.findById(recipeId)).thenReturn(Optional.of(existingRecipe));
        when(recipeRepository.save(any(Recipe.class))).thenAnswer(invocation -> invocation.getArgument(0));
        // calculateAndSetNutrition calls findByIdWithIngredients if ingredients is empty
        when(recipeRepository.findByIdWithIngredients(recipeId)).thenReturn(Optional.of(existingRecipe));

        // Bu senaryoda ingredients listesi boş geliyor (sadece hazırlanış metni girilmiş gibi)
        Recipe result = recipeService.updateRecipe(recipeId, updatedData, List.of(), userId);

        assertNotNull(result);
        assertEquals("New Instructions", result.getInstructions());
        assertEquals(0, result.getRecipeIngredients().size());
        assertEquals(0.0, result.getTotalCalories());
        verify(recipeRepository, org.mockito.Mockito.atLeastOnce()).save(any(Recipe.class));
    }

    @Test
    void shouldCreatePendingUpdateFromApprovedRecipeWithMandatoryFields() {
        Long recipeId = 1L;
        String userId = "user123";
        Recipe existingRecipe = Recipe.builder()
            .id(recipeId)
            .title("Approved Title")
            .status(RecipeStatus.APPROVED)
            .averageRating(4.5)
            .ratingCount(10)
            .createdBy("anotherUser")
            .build();

        Recipe updatedData = Recipe.builder()
            .title("Proposed Change")
            .status(RecipeStatus.PENDING)
            .build();

        when(recipeRepository.findById(recipeId)).thenReturn(Optional.of(existingRecipe));
        when(recipeRepository.findByParentIdAndStatus(recipeId, RecipeStatus.PENDING)).thenReturn(Optional.empty());
        when(recipeRepository.save(any(Recipe.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Recipe result = recipeService.updateRecipe(recipeId, updatedData, null, userId);

        assertNotNull(result);
        assertEquals(recipeId, result.getParentId());
        assertEquals(RecipeStatus.PENDING, result.getStatus());
        assertEquals(4.5, result.getAverageRating());
        assertEquals(10, result.getRatingCount());
        assertEquals(userId, result.getCreatedBy());
        assertEquals(true, result.isActive());
    }
}
