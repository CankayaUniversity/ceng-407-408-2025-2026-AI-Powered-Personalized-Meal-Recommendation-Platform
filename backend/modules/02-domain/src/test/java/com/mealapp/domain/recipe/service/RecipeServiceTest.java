package com.mealapp.domain.recipe.service;

import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.repository.RecipeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecipeServiceTest {

    @Mock
    private RecipeRepository recipeRepository;

    @InjectMocks
    private RecipeService recipeService;

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
