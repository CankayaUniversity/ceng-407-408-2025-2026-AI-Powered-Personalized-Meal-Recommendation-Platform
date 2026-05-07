package com.mealapp.domain.recipe.service;

import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.entity.IngredientNutrition;
import com.mealapp.domain.recipe.repository.IngredientRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class IngredientServiceUpdateTest {

    @Mock
    private IngredientRepository ingredientRepository;

    @Mock
    private RecipeService recipeService;

    @InjectMocks
    private IngredientServiceImpl ingredientService;

    @Test
    void shouldUpdateIngredientAndTriggerRecipeRefresh() {
        // Given
        Long id = 1L;
        Ingredient existing = Ingredient.builder()
                .id(id)
                .name("Old Name")
                .density(1.0)
                .physicalState(Ingredient.PhysicalState.SOLID)
                .build();
        
        when(ingredientRepository.findById(id)).thenReturn(Optional.of(existing));
        when(ingredientRepository.save(any(Ingredient.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Ingredient updated = ingredientService.updateIngredient(
                id, "New Name", "VEGETABLE", 1.2, "SOLID", "adet",
                100.0, 10.0, 20.0, 5.0
        );

        // Then
        assertEquals("New Name", updated.getName());
        assertEquals(Ingredient.Category.VEGETABLE, updated.getCategory());
        assertEquals(1.2, updated.getDensity());
        assertEquals("adet", updated.getPreferredUnit());
        
        assertNotNull(updated.getNutrition());
        assertEquals(100.0, updated.getNutrition().getCaloriesPer100g());
        assertEquals(10.0, updated.getNutrition().getProteinPer100g());

        verify(recipeService).refreshRecipesByIngredient(id);
        verify(ingredientRepository).save(existing);
    }
}
