package com.mealapp.domain.recipe.service;

import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.entity.IngredientNutrition;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.entity.RecipeIngredient;
import com.mealapp.domain.recipe.repository.RecipeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecipeServiceTest {

    @Mock
    private RecipeRepository recipeRepository;

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
        when(recipeRepository.findAllWithIngredients()).thenReturn(List.of(new Recipe()));
        
        List<Recipe> result = recipeService.findAll();
        
        assertEquals(1, result.size());
    }

    @Test
    void shouldFindByIngredients() {
        List<String> ingredientNames = List.of("Salt");
        when(recipeRepository.findByIngredientNamesIn(ingredientNames)).thenReturn(List.of(new Recipe()));

        List<Recipe> result = recipeService.findByIngredients(ingredientNames);

        assertEquals(1, result.size());
    }
}
