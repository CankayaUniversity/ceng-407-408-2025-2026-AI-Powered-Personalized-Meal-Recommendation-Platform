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

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
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
                .andExpect(jsonPath("$.portionLabel").value("1 bowl"))
                .andExpect(jsonPath("$.isFromInventory").value(true))
                .andExpect(jsonPath("$.estimatedCalories").value(280));
    }

    @Test
    void shouldReturnStandardUnits() throws Exception {
        mockMvc.perform(get("/api/v1/consumptions/units"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.gram").value(1.0))
                .andExpect(jsonPath("$.kg").value(1000.0))
                .andExpect(jsonPath("$.ml").value(1.0));
    }

    @Test
    void shouldConvertUnitsToGrams() throws Exception {
        mockMvc.perform(get("/api/v1/consumptions/convert")
                        .param("amount", "2.0")
                        .param("unit", "cup"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(480.0));
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

    @Test
    void shouldLogConsumptionForMultipleMembersAndDeductFromInventoryOnlyOnce() throws Exception {
        User me = User.builder().id("system-user").name("Me").build();
        User friend = User.builder().id("friend-user").name("Friend").build();
        Recipe recipe = Recipe.builder().id(10L).title("Salad").build();
        InventoryGroup group = InventoryGroup.builder().id(5L).name("Office").build();

        when(userService.findById("system-user")).thenReturn(Optional.of(me));
        when(userService.findById("friend-user")).thenReturn(Optional.of(friend));
        when(recipeService.findById(10L)).thenReturn(Optional.of(recipe));
        when(inventoryService.getUserInventoryGroup("system-user", 5L)).thenReturn(group);

        DailyConsumption savedMe = DailyConsumption.builder().id(101L).user(me).foodName("Salad").build();
        DailyConsumption savedFriend = DailyConsumption.builder().id(102L).user(friend).foodName("Salad").build();

        // Beklenti: İlk kullanıcı için true, ikinci kullanıcı için false (veya tam tersi ama sadece bir kere true)
        when(dailyConsumptionService.logConsumption(argThat(c -> c != null && c.getUser() != null && "system-user".equals(c.getUser().getId())), eq(true))).thenReturn(savedMe);
        when(dailyConsumptionService.logConsumption(argThat(c -> c != null && c.getUser() != null && "friend-user".equals(c.getUser().getId())), eq(false))).thenReturn(savedFriend);

        mockMvc.perform(post("/api/v1/consumptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "recipeId": 10,
                                  "inventoryGroupId": 5,
                                  "mealType": "LUNCH",
                                  "members": [
                                    { "userId": "system-user", "portionMultiplier": 1.0 },
                                    { "userId": "friend-user", "portionMultiplier": 0.5 }
                                  ]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(101));

        verify(dailyConsumptionService).logConsumption(argThat(c -> "system-user".equals(c.getUser().getId()) 
                && c.getPortionMultiplier() == 1.0), eq(true));
        verify(dailyConsumptionService).logConsumption(argThat(c -> "friend-user".equals(c.getUser().getId()) 
                && c.getPortionMultiplier() == 0.5), eq(false));
    }

    @Test
    void shouldLogConsumptionForMultipleMembersWithIngredients() throws Exception {
        User me = User.builder().id("system-user").name("Me").build();
        User friend = User.builder().id("friend-user").name("Friend").build();
        Ingredient ingredient = Ingredient.builder().id(3L).name("Banana").build();

        when(userService.findById("system-user")).thenReturn(Optional.of(me));
        when(userService.findById("friend-user")).thenReturn(Optional.of(friend));
        when(ingredientService.findById(3L)).thenReturn(Optional.of(ingredient));

        DailyConsumption savedMe = DailyConsumption.builder().id(101L).user(me).foodName("Banana").build();
        DailyConsumption savedFriend = DailyConsumption.builder().id(102L).user(friend).foodName("Banana").build();

        when(dailyConsumptionService.logConsumption(any(), anyBoolean())).thenReturn(savedMe).thenReturn(savedFriend);

        mockMvc.perform(post("/api/v1/consumptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "ingredientId": 3,
                                  "mealType": "SNACK",
                                  "members": [
                                    { "userId": "system-user", "portionGrams": 100.0 },
                                    { "userId": "friend-user", "portionGrams": 50.0 }
                                  ]
                                }
                                """))
                .andExpect(status().isOk());

        verify(dailyConsumptionService).logConsumption(argThat(c -> "system-user".equals(c.getUser().getId()) 
                && c.getPortionGrams() == 100.0), anyBoolean());
        verify(dailyConsumptionService).logConsumption(argThat(c -> "friend-user".equals(c.getUser().getId()) 
                && c.getPortionGrams() == 50.0), anyBoolean());
    }

    @Test
    void shouldLogConsumptionForMultipleMembersWithDefaultValues() throws Exception {
        User me = User.builder().id("system-user").name("Me").build();
        User friend = User.builder().id("friend-user").name("Friend").build();
        Recipe recipe = Recipe.builder().id(10L).title("Salad").build();

        when(userService.findById(anyString())).thenAnswer(invocation -> {
            String id = invocation.getArgument(0);
            if ("system-user".equals(id)) return Optional.of(me);
            if ("friend-user".equals(id)) return Optional.of(friend);
            return Optional.empty();
        });
        when(userService.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(recipeService.findById(10L)).thenReturn(Optional.of(recipe));
        when(dailyConsumptionService.logConsumption(any(), anyBoolean())).thenReturn(DailyConsumption.builder().id(101L).user(me).foodName("Salad").build());

        mockMvc.perform(post("/api/v1/consumptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "recipeId": 10,
                                  "mealType": "LUNCH",
                                  "portionMultiplier": 1.5,
                                  "portionLabel": "1 large bowl",
                                  "members": [
                                    { "userId": "system-user" },
                                    { "userId": "friend-user", "portionMultiplier": 0.8, "portionLabel": "small bowl" }
                                  ]
                                }
                                """))
                .andExpect(status().isOk());

        // system-user, 1 üye değil 2 üye olduğu için ana istekteki multiplier yerine varsayılan 1.0 almalı (yeni mantığa göre)
        verify(dailyConsumptionService).logConsumption(argThat(c -> "system-user".equals(c.getUser().getId()) 
                && c.getPortionMultiplier() == 1.0
                && "1 large bowl".equals(c.getPortionLabel())), anyBoolean());
        
        // friend-user, kendi multiplier (0.8) ve etiketini (small bowl) almalı
        verify(dailyConsumptionService).logConsumption(argThat(c -> "friend-user".equals(c.getUser().getId()) 
                && c.getPortionMultiplier() == 0.8
                && "small bowl".equals(c.getPortionLabel())), anyBoolean());
    }

    @Test
    void shouldLogConsumptionWithProperGramsCalculation() throws Exception {
        User me = User.builder().id("system-user").name("Me").build();
        User friend = User.builder().id("friend-user").name("Friend").build();
        Ingredient ingredient = Ingredient.builder().id(3L).name("Banana").build();

        when(userService.findById(anyString())).thenAnswer(invocation -> {
            String id = invocation.getArgument(0);
            if ("system-user".equals(id)) return Optional.of(me);
            if ("friend-user".equals(id)) return Optional.of(friend);
            return Optional.empty();
        });
        when(userService.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(ingredientService.findById(3L)).thenReturn(Optional.of(ingredient));
        when(dailyConsumptionService.logConsumption(any(), anyBoolean())).thenReturn(DailyConsumption.builder().id(101L).user(me).foodName("Banana").build());

        mockMvc.perform(post("/api/v1/consumptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "ingredientId": 3,
                                  "mealType": "SNACK",
                                  "members": [
                                    { "userId": "system-user", "portionGrams": 120.0 },
                                    { "userId": "friend-user", "portionLabel": "100 gram" }
                                  ]
                                }
                                """))
                .andExpect(status().isOk());

        verify(dailyConsumptionService).logConsumption(argThat(c -> "system-user".equals(c.getUser().getId()) 
                && c.getPortionGrams() == 120.0), anyBoolean());
        
        verify(dailyConsumptionService).logConsumption(argThat(c -> "friend-user".equals(c.getUser().getId()) 
                && c.getPortionGrams() == 100.0), anyBoolean());
    }
    @Test
    void shouldLogIndependentCaloriesForMultipleMembers() throws Exception {
        User me = User.builder().id("system-user").name("Me").build();
        User friend = User.builder().id("friend-user").name("Friend").build();
        
        // 100g = 100 kalori olsun (basitlik için)
        Ingredient ingredient = Ingredient.builder()
                .id(3L)
                .name("Test Food")
                .build();

        when(userService.findById("system-user")).thenReturn(Optional.of(me));
        when(userService.findById("friend-user")).thenReturn(Optional.of(friend));
        when(ingredientService.findById(3L)).thenReturn(Optional.of(ingredient));

        // Mock service: Her çağrıda farklı bir nesne dönsün ve içindeki değerler girişten (portionGrams) türesin
        when(dailyConsumptionService.logConsumption(any(), anyBoolean())).thenAnswer(invocation -> {
            DailyConsumption input = invocation.getArgument(0);
            // enrichment simülasyonu: 1 gram = 1 kalori
            input.setEstimatedCalories(input.getPortionGrams() != null ? input.getPortionGrams().intValue() : 0);
            return input;
        });

        mockMvc.perform(post("/api/v1/consumptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "ingredientId": 3,
                                  "mealType": "SNACK",
                                  "members": [
                                    { "userId": "system-user", "portionGrams": 100.0 },
                                    { "userId": "friend-user", "portionGrams": 50.0 }
                                  ]
                                }
                                """))
                .andExpect(status().isOk());

        // Doğrulama: system-user 100 kalori, friend-user 50 kalori almış olmalı.
        // Eğer "totali birine yansıyor" hatası varsa, biri 150 diğeri 0 veya ikisi de 150 vb. olabilir.
        
        verify(dailyConsumptionService).logConsumption(argThat(c -> 
                "system-user".equals(c.getUser().getId()) && c.getPortionGrams() == 100.0), anyBoolean());
        
        verify(dailyConsumptionService).logConsumption(argThat(c -> 
                "friend-user".equals(c.getUser().getId()) && c.getPortionGrams() == 50.0), anyBoolean());
    }
    @Test
    void shouldLogIndependentCaloriesForMultipleMembersWithRecipe() throws Exception {
        User me = User.builder().id("system-user").name("Me").build();
        User friend = User.builder().id("friend-user").name("Friend").build();
        
        // 1 full recipe = 1000 kalori
        Recipe recipe = Recipe.builder()
                .id(10L)
                .title("Big Cake")
                .totalCalories(1000.0)
                .totalProtein(10.0)
                .totalCarbs(10.0)
                .totalFat(10.0)
                .build();

        when(userService.findById("system-user")).thenReturn(Optional.of(me));
        when(userService.findById("friend-user")).thenReturn(Optional.of(friend));
        when(recipeService.findById(10L)).thenReturn(Optional.of(recipe));

        // Mock service: Input'u değiştirip dönsün (enrichment simülasyonu)
        when(dailyConsumptionService.logConsumption(any(), anyBoolean())).thenAnswer(invocation -> {
            DailyConsumption input = invocation.getArgument(0);
            double mult = input.getPortionMultiplier() != null ? input.getPortionMultiplier() : 1.0;
            input.setEstimatedCalories((int)(1000 * mult));
            return input;
        });

        mockMvc.perform(post("/api/v1/consumptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "recipeId": 10,
                                  "mealType": "LUNCH",
                                  "members": [
                                    { "userId": "system-user", "portionMultiplier": 1.0 },
                                    { "userId": "friend-user", "portionMultiplier": 0.5 }
                                  ]
                                }
                                """))
                .andExpect(status().isOk());

        // Doğrulama: system-user 1000 kalori (multiplier 1.0), friend-user 500 kalori (multiplier 0.5) almış olmalı.
        verify(dailyConsumptionService).logConsumption(argThat(c -> 
                "system-user".equals(c.getUser().getId()) && c.getEstimatedCalories() == 1000), anyBoolean());
        
        verify(dailyConsumptionService).logConsumption(argThat(c -> 
                "friend-user".equals(c.getUser().getId()) && c.getEstimatedCalories() == 500), anyBoolean());
    }
}
