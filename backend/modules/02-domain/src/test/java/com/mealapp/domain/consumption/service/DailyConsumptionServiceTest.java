package com.mealapp.domain.consumption.service;

import com.mealapp.domain.consumption.entity.DailyConsumption;
import com.mealapp.domain.consumption.repository.DailyConsumptionRepository;
import com.mealapp.domain.inventory.service.InventoryService;
import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.entity.RecipeIngredient;
import com.mealapp.domain.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DailyConsumptionServiceTest {

    @Mock
    private DailyConsumptionRepository dailyConsumptionRepository;

    @Mock
    private InventoryService inventoryService;

    @InjectMocks
    private DailyConsumptionService dailyConsumptionService;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId("user-123");
    }

    @Test
    void logConsumption_WhenFromInventory_ShouldDeductFromInventory() {
        // Given
        Ingredient ingredient = Ingredient.builder().id(1L).name("Tomato").build();
        RecipeIngredient recipeIngredient = RecipeIngredient.builder()
                .ingredient(ingredient)
                .grams(100.0)
                .build();
        
        Recipe recipe = Recipe.builder()
                .id(1L)
                .recipeIngredients(List.of(recipeIngredient))
                .build();

        DailyConsumption consumption = DailyConsumption.builder()
                .user(user)
                .recipe(recipe)
                .isFromInventory(true)
                .build();

        when(dailyConsumptionRepository.save(any())).thenReturn(consumption);

        // When
        dailyConsumptionService.logConsumption(consumption);

        // Then
        verify(inventoryService).consumeFromInventory("user-123", 1L, 100.0);
        verify(dailyConsumptionRepository).save(consumption);
    }

    @Test
    void logConsumption_WhenNotFromInventory_ShouldNotDeductFromInventory() {
        // Given
        Recipe recipe = Recipe.builder().id(1L).build();
        DailyConsumption consumption = DailyConsumption.builder()
                .user(user)
                .recipe(recipe)
                .isFromInventory(false)
                .build();

        when(dailyConsumptionRepository.save(any())).thenReturn(consumption);

        // When
        dailyConsumptionService.logConsumption(consumption);

        // Then
        verify(inventoryService, never()).consumeFromInventory(any(), any(), any());
        verify(dailyConsumptionRepository).save(consumption);
    }
}
