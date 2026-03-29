package com.mealapp.app.controller;

import com.mealapp.domain.consumption.entity.DailyConsumption;
import com.mealapp.domain.consumption.service.DailyConsumptionService;
import com.mealapp.domain.inventory.entity.InventoryGroup;
import com.mealapp.domain.inventory.service.InventoryService;
import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.service.IngredientService;
import com.mealapp.domain.recipe.service.RecipeService;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.user.service.UserService;
import com.mealapp.infrastructure.test.AbstractMockMvcTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ConsumptionControllerTest extends AbstractMockMvcTest {

    @MockitoBean
    private DailyConsumptionService dailyConsumptionService;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private RecipeService recipeService;

    @MockitoBean
    private IngredientService ingredientService;

    @MockitoBean
    private InventoryService inventoryService;

    @Test
    void shouldUseAuthenticatedUserAndSelectedInventoryGroupForRecipeConsumption() throws Exception {
        User user = User.builder().id("system-user").build();
        Recipe recipe = Recipe.builder().id(7L).title("Mercimek Corbasi").build();
        InventoryGroup group = InventoryGroup.builder().id(4L).name("Home").build();
        DailyConsumption saved = DailyConsumption.builder()
                .id(42L)
                .user(user)
                .foodName("Mercimek Corbasi")
                .recipe(recipe)
                .inventoryGroup(group)
                .portionLabel("1 bowl")
                .estimatedCalories(280)
                .estimatedProtein(13.5)
                .estimatedCarbs(30.2)
                .estimatedFat(7.1)
                .isFromInventory(true)
                .consumedAt(LocalDateTime.of(2026, 3, 29, 12, 30))
                .build();

        when(userService.findById("system-user")).thenReturn(Optional.of(user));
        when(recipeService.findById(7L)).thenReturn(Optional.of(recipe));
        when(inventoryService.getUserInventoryGroup("system-user", 4L)).thenReturn(group);
        when(dailyConsumptionService.logConsumption(argThat(consumption ->
                consumption.getUser() != null
                        && "system-user".equals(consumption.getUser().getId())
                        && consumption.getInventoryGroup() != null
                        && consumption.getInventoryGroup().getId().equals(4L)
                        && consumption.getRecipe() != null
                        && consumption.getRecipe().getId().equals(7L)
        ))).thenReturn(saved);

        mockMvc.perform(post("/api/v1/consumptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "userId": "another-user",
                                  "recipeId": 7,
                                  "inventoryGroupId": 4,
                                  "mealType": "LUNCH",
                                  "portionLabel": "1 bowl",
                                  "portionMultiplier": 1.0
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(42))
                .andExpect(jsonPath("$.foodName").value("Mercimek Corbasi"))
                .andExpect(jsonPath("$.inventoryGroupId").value(4))
                .andExpect(jsonPath("$.isFromInventory").value(true))
                .andExpect(jsonPath("$.estimatedCalories").value(280));
    }

    @Test
    void shouldAllowOutsideIngredientConsumptionWithoutInventoryLookup() throws Exception {
        User user = User.builder().id("system-user").build();
        Ingredient ingredient = Ingredient.builder().id(3L).name("Banana").build();
        DailyConsumption saved = DailyConsumption.builder()
                .id(99L)
                .user(user)
                .foodName("Banana")
                .ingredient(ingredient)
                .portionLabel("1 piece")
                .estimatedCalories(105)
                .isFromInventory(false)
                .consumedAt(LocalDateTime.of(2026, 3, 29, 16, 0))
                .build();

        when(userService.findById("system-user")).thenReturn(Optional.of(user));
        when(ingredientService.findById(3L)).thenReturn(Optional.of(ingredient));
        when(dailyConsumptionService.logConsumption(argThat(consumption ->
                consumption.getInventoryGroup() == null
                        && consumption.getIngredient() != null
                        && consumption.getIngredient().getId().equals(3L)
                        && Boolean.FALSE.equals(consumption.getIsFromInventory())
        ))).thenReturn(saved);

        mockMvc.perform(post("/api/v1/consumptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "ingredientId": 3,
                                  "mealType": "SNACK",
                                  "portionLabel": "1 piece",
                                  "portionGrams": 120
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(99))
                .andExpect(jsonPath("$.foodName").value("Banana"))
                .andExpect(jsonPath("$.isFromInventory").value(false));

        verify(inventoryService, never()).getUserInventoryGroup(any(), any());
    }

    @Test
    void shouldReturnDailySummaryForAuthenticatedUser() throws Exception {
        DailyConsumptionService.DailyNutritionSummary summary =
                new DailyConsumptionService.DailyNutritionSummary(1280, 86.4, 132.8, 41.2);

        when(dailyConsumptionService.getDailyNutritionSummary("system-user", LocalDate.of(2026, 3, 29)))
                .thenReturn(summary);

        mockMvc.perform(get("/api/v1/consumptions/summary")
                        .param("date", "2026-03-29"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.date").value("2026-03-29"))
                .andExpect(jsonPath("$.totalCalories").value(1280))
                .andExpect(jsonPath("$.totalProtein").value(86.4))
                .andExpect(jsonPath("$.totalCarbs").value(132.8))
                .andExpect(jsonPath("$.totalFat").value(41.2));
    }
}
