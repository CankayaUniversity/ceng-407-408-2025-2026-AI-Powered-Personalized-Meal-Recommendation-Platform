package com.mealapp.domain.consumption.service;

import com.mealapp.domain.consumption.entity.DailyConsumption;
import com.mealapp.domain.consumption.repository.DailyConsumptionRepository;
import com.mealapp.domain.inventory.entity.InventoryGroup;
import com.mealapp.domain.inventory.service.InventoryService;
import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.entity.IngredientNutrition;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.entity.RecipeIngredient;
import com.mealapp.domain.recipe.repository.IngredientRepository;
import com.mealapp.domain.recipe.repository.RecipeRepository;
import com.mealapp.domain.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DailyConsumptionServiceTest {

    @Mock
    private DailyConsumptionRepository dailyConsumptionRepository;

    @Mock
    private InventoryService inventoryService;

    @Mock
    private RecipeRepository recipeRepository;

    @Mock
    private IngredientRepository ingredientRepository;

    @InjectMocks
    private DailyConsumptionService dailyConsumptionService;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId("user-123");
    }

    @Test
    void logConsumption_WhenRecipeIsLoggedForSpecificGroup_ShouldDeductScaledIngredientsAndSetNutrition() {
        Ingredient ingredient = Ingredient.builder().id(1L).name("Tomato").build();
        RecipeIngredient recipeIngredient = RecipeIngredient.builder()
                .ingredient(ingredient)
                .grams(100.0)
                .build();

        Recipe recipe = Recipe.builder()
                .id(1L)
                .title("Tomato Soup")
                .totalCalories(320.0)
                .totalProtein(12.0)
                .totalCarbs(24.0)
                .totalFat(8.0)
                .recipeIngredients(List.of(recipeIngredient))
                .build();

        DailyConsumption consumption = DailyConsumption.builder()
                .user(user)
                .recipe(Recipe.builder().id(1L).build())
                .inventoryGroup(InventoryGroup.builder().id(10L).build())
                .portionMultiplier(1.5)
                .isFromInventory(true)
                .mealType(DailyConsumption.MealType.LUNCH)
                .build();

        when(recipeRepository.findByIdWithIngredients(1L)).thenReturn(Optional.of(recipe));
        when(dailyConsumptionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        DailyConsumption saved = dailyConsumptionService.logConsumption(consumption);

        verify(inventoryService).consumeFromInventoryGroup("user-123", 10L, 1L, 150.0, "g");
        verify(dailyConsumptionRepository).save(consumption);
        assertEquals(480, saved.getEstimatedCalories());
        assertEquals(18.0, saved.getEstimatedProtein());
        assertEquals(36.0, saved.getEstimatedCarbs());
        assertEquals(12.0, saved.getEstimatedFat());
    }

    @Test
    void logConsumption_WhenRecipeIsOutside_ShouldNotDeductInventory() {
        Recipe recipe = Recipe.builder()
                .id(1L)
                .title("Pasta")
                .totalCalories(420.0)
                .totalProtein(14.0)
                .totalCarbs(62.0)
                .totalFat(11.0)
                .build();

        DailyConsumption consumption = DailyConsumption.builder()
                .user(user)
                .recipe(Recipe.builder().id(1L).build())
                .portionMultiplier(1.0)
                .isFromInventory(false)
                .build();

        when(recipeRepository.findByIdWithIngredients(1L)).thenReturn(Optional.of(recipe));
        when(dailyConsumptionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        dailyConsumptionService.logConsumption(consumption);

        verify(inventoryService, never()).consumeFromInventoryGroup(any(), any(), any(), any(), any());
        verify(dailyConsumptionRepository).save(consumption);
    }

    @Test
    void logConsumption_WhenIngredientIsLoggedForSpecificGroup_ShouldCalculateNutritionAndDeductIngredient() {
        Ingredient ingredient = Ingredient.builder()
                .id(2L)
                .name("Apple")
                .nutrition(IngredientNutrition.builder()
                        .caloriesPer100g(52.0)
                        .proteinPer100g(0.3)
                        .carbsPer100g(14.0)
                        .fatPer100g(0.2)
                        .build())
                .build();

        DailyConsumption consumption = DailyConsumption.builder()
                .user(user)
                .ingredient(Ingredient.builder().id(2L).build())
                .inventoryGroup(InventoryGroup.builder().id(11L).build())
                .portionGrams(150.0)
                .isFromInventory(true)
                .mealType(DailyConsumption.MealType.SNACK)
                .build();

        when(ingredientRepository.findByIdWithUnits(2L)).thenReturn(Optional.of(ingredient));
        when(dailyConsumptionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        DailyConsumption saved = dailyConsumptionService.logConsumption(consumption);

        verify(inventoryService).consumeFromInventoryGroup("user-123", 11L, 2L, 150.0, "g");
        assertEquals(78, saved.getEstimatedCalories());
        assertEquals(0.5, saved.getEstimatedProtein());
        assertEquals(21.0, saved.getEstimatedCarbs());
        assertEquals(0.3, saved.getEstimatedFat());
    }

    @Test
    void logConsumption_WhenRecipeHasServings_ShouldScaleByServingsAndMultiplier() {
        Ingredient ingredient = Ingredient.builder().id(1L).name("Tomato").build();
        RecipeIngredient recipeIngredient = RecipeIngredient.builder()
                .ingredient(ingredient)
                .grams(400.0) // 4 kişilik tarifte toplam 400g tomato
                .build();

        Recipe recipe = Recipe.builder()
                .id(1L)
                .servings(4) // 4 Kişilik tarif
                .totalCalories(1000.0) // Toplam 1000 kcal
                .totalProtein(40.0)
                .totalCarbs(100.0)
                .totalFat(20.0)
                .recipeIngredients(List.of(recipeIngredient))
                .build();

        // Kullanıcı 1.0 multiplier (yani "1 porsiyon") seçiyor. 
        // 4 kişilik tarifin 1 porsiyonu = 1/4 = 0.25 çarpanı olmalı.
        DailyConsumption consumption = DailyConsumption.builder()
                .user(user)
                .recipe(Recipe.builder().id(1L).build())
                .inventoryGroup(InventoryGroup.builder().id(10L).build())
                .portionMultiplier(1.0)
                .isFromInventory(true)
                .build();

        when(recipeRepository.findByIdWithIngredients(1L)).thenReturn(Optional.of(recipe));
        when(dailyConsumptionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        DailyConsumption saved = dailyConsumptionService.logConsumption(consumption);

        // Envanterden 400 * (1.0 / 4) = 100g düşmeli
        verify(inventoryService).consumeFromInventoryGroup("user-123", 10L, 1L, 100.0, "g");
        
        // Besin değerleri 1000 * (1.0 / 4) = 250 kcal olmalı
        assertEquals(250, saved.getEstimatedCalories());
        assertEquals(10.0, saved.getEstimatedProtein());
        assertEquals(25.0, saved.getEstimatedCarbs());
        assertEquals(5.0, saved.getEstimatedFat());
    }
}
