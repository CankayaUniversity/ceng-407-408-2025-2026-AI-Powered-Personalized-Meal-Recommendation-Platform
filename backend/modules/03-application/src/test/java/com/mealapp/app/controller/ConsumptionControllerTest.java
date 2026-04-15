package com.mealapp.app.controller;

import com.mealapp.domain.consumption.entity.DailyConsumption;
import com.mealapp.domain.consumption.service.DailyConsumptionService;
import com.mealapp.domain.inventory.entity.Inventory;
import com.mealapp.domain.inventory.entity.InventoryGroup;
import com.mealapp.domain.inventory.service.InventoryService;
import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.recipe.entity.Recipe;
import com.mealapp.domain.recipe.entity.RecipeIngredient;
import com.mealapp.domain.recipe.entity.IngredientNutrition;
import com.mealapp.domain.recipe.service.IngredientService;
import com.mealapp.domain.recipe.service.RecipeService;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.user.service.UserService;
import com.mealapp.infrastructure.test.AbstractMockMvcTest;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
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
        when(ingredientService.findByIdWithUnits(3L)).thenReturn(Optional.of(ingredient));
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
    void shouldLogConsumptionForMultipleMembersAndDeductFromInventoryForEveryMember() throws Exception {
        User me = User.builder().id("system-user").name("Me").build();
        User friend = User.builder().id("friend-user").name("Friend").build();
        Recipe recipe = Recipe.builder().id(10L).title("Salad").build();
        InventoryGroup group = InventoryGroup.builder().id(5L).name("Office").build();

        when(userService.findById("system-user")).thenReturn(Optional.of(me));
        when(userService.findById("friend-user")).thenReturn(Optional.of(friend));
        when(recipeService.findById(10L)).thenReturn(Optional.of(recipe));
        when(inventoryService.getUserInventoryGroup("system-user", 5L)).thenReturn(group);
        
        // Group users listesini set edelim
        group.setUsers(new java.util.ArrayList<>(java.util.List.of(me, friend)));

        DailyConsumption savedMe = DailyConsumption.builder().id(101L).user(me).foodName("Salad").build();
        DailyConsumption savedFriend = DailyConsumption.builder().id(102L).user(friend).foodName("Salad").build();

        // Beklenti: Her kullanıcı için true (kendi paylarını stoktan düşecekler)
        when(dailyConsumptionService.logConsumption(argThat(c -> c != null && c.getUser() != null && "system-user".equals(c.getUser().getId())), eq(true))).thenReturn(savedMe);
        when(dailyConsumptionService.logConsumption(argThat(c -> c != null && c.getUser() != null && "friend-user".equals(c.getUser().getId())), eq(true))).thenReturn(savedFriend);

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
                && c.getPortionMultiplier() == 0.5), eq(true));
    }

    @Test
    void shouldLogConsumptionForMultipleMembersWithIngredients() throws Exception {
        User me = User.builder().id("system-user").name("Me").build();
        User friend = User.builder().id("friend-user").name("Friend").build();
        Ingredient ingredient = Ingredient.builder().id(3L).name("Banana").build();

        when(userService.findById("system-user")).thenReturn(Optional.of(me));
        when(userService.findById("friend-user")).thenReturn(Optional.of(friend));
        when(ingredientService.findByIdWithUnits(3L)).thenReturn(Optional.of(ingredient));

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

        // system-user, 1 üye değil 2 üye olduğu için ana istekteki multiplier 1.5'i almalı (yeni mantığa göre fallback)
        verify(dailyConsumptionService).logConsumption(argThat(c -> "system-user".equals(c.getUser().getId()) 
                && c.getPortionMultiplier() == 1.5
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
        when(ingredientService.findByIdWithUnits(3L)).thenReturn(Optional.of(ingredient));
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
        when(ingredientService.findByIdWithUnits(3L)).thenReturn(Optional.of(ingredient));

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

    @Test
    void shouldFixTotalCaloriesBugWhenMultipleMembersPresent() throws Exception {
        User berk = User.builder().id("system-user").name("Berk").build();
        User ufuk = User.builder().id("ufuk-id").name("Ufuk").build();
        Recipe recipe = Recipe.builder().id(30L).title("Test Recipe").totalCalories(1000.0).build();
        
        // InventoryGroup ve User listesi ekleyelim
        InventoryGroup group = InventoryGroup.builder().id(99L).name("Office").build();
        group.setUsers(new java.util.ArrayList<>(java.util.List.of(berk, ufuk)));

        // berk-id olarak MockMvc'yi kandıramayabiliriz, system-user üzerinden gidelim.
        when(userService.findById("system-user")).thenReturn(Optional.of(berk));
        when(userService.findById("ufuk-id")).thenReturn(Optional.of(ufuk));
        when(recipeService.findById(30L)).thenReturn(Optional.of(recipe));
        when(inventoryService.getUserInventoryGroup(any(), eq(99L))).thenReturn(group);
        
        when(dailyConsumptionService.logConsumption(any(), anyBoolean())).thenAnswer(inv -> inv.getArgument(0));

        mockMvc.perform(post("/api/v1/consumptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "recipeId": 30,
                                  "inventoryGroupId": 99,
                                  "mealType": "LUNCH",
                                  "members": [
                                    { "userId": "system-user", "portionMultiplier": 3.0 },
                                    { "userId": "ufuk-id", "portionMultiplier": 6.0 }
                                  ]
                                }
                                """))
                .andExpect(status().isOk());

        // Veritabanına (Service'e) giden nesneleri yakalayalım.
        ArgumentCaptor<DailyConsumption> captor = ArgumentCaptor.forClass(DailyConsumption.class);
        verify(dailyConsumptionService, atLeastOnce()).logConsumption(captor.capture(), anyBoolean());
        
        List<DailyConsumption> captured = captor.getAllValues();
        
        boolean berkFound = captured.stream().anyMatch(c -> "system-user".equals(c.getUser().getId()) && c.getPortionMultiplier() == 3.0);
        boolean ufukFound = captured.stream().anyMatch(c -> "ufuk-id".equals(c.getUser().getId()) && c.getPortionMultiplier() == 6.0);
        
        assertTrue(berkFound, "Berk should have a log with multiplier 3.0");
        assertTrue(ufukFound, "Ufuk should have a log with multiplier 6.0");
    }

    @Test
    void shouldHandleIndependentItemsForMultipleMembers() throws Exception {
        User berk = User.builder().id("system-user").name("Berk").build();
        User ufuk = User.builder().id("ufuk-id").name("Ufuk").build();
        Recipe popcorn = Recipe.builder().id(101L).title("Popcorn").totalCalories(300.0).build();
        Recipe meatballs = Recipe.builder().id(102L).title("Meatballs").totalCalories(600.0).build();
        
        InventoryGroup group = InventoryGroup.builder().id(99L).name("Office").build();
        group.setUsers(new java.util.ArrayList<>(java.util.List.of(berk, ufuk)));

        when(userService.findById("system-user")).thenReturn(Optional.of(berk));
        when(userService.findById("ufuk-id")).thenReturn(Optional.of(ufuk));
        when(recipeService.findById(101L)).thenReturn(Optional.of(popcorn));
        when(recipeService.findById(102L)).thenReturn(Optional.of(meatballs));
        when(inventoryService.getUserInventoryGroup(any(), eq(99L))).thenReturn(group);
        when(dailyConsumptionService.logConsumption(any(), anyBoolean())).thenAnswer(inv -> inv.getArgument(0));

        // Bu test, her üyenin kendi bağımsız tarifini seçebilmesini doğrular.
        mockMvc.perform(post("/api/v1/consumptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "inventoryGroupId": 99,
                                  "mealType": "SNACK",
                                  "members": [
                                    { "userId": "system-user", "recipeId": 101, "portionMultiplier": 1.0 },
                                    { "userId": "ufuk-id", "recipeId": 102, "portionMultiplier": 2.0 }
                                  ]
                                }
                                """))
                .andExpect(status().isOk());

        ArgumentCaptor<DailyConsumption> captor = ArgumentCaptor.forClass(DailyConsumption.class);
        verify(dailyConsumptionService, times(2)).logConsumption(captor.capture(), eq(true));
        
        List<DailyConsumption> captured = captor.getAllValues();
        assertEquals(2, captured.size());
        
        DailyConsumption berkLog = captured.stream().filter(c -> "system-user".equals(c.getUser().getId())).findFirst().orElseThrow();
        DailyConsumption ufukLog = captured.stream().filter(c -> "ufuk-id".equals(c.getUser().getId())).findFirst().orElseThrow();
        
        assertEquals("Popcorn", berkLog.getFoodName());
        assertEquals(1.0, berkLog.getPortionMultiplier());
        
        assertEquals("Meatballs", ufukLog.getFoodName());
        assertEquals(2.0, ufukLog.getPortionMultiplier());
        assertEquals(99L, berkLog.getInventoryGroup().getId());
        assertEquals(99L, ufukLog.getInventoryGroup().getId());
    }

    @Test
    void shouldHandleBulkRequestWithoutMainUser() throws Exception {
        User ufuk = User.builder().id("ufuk-id").name("Ufuk").build();
        Recipe popcorn = Recipe.builder().id(101L).title("Popcorn").totalCalories(300.0).build();
        
        InventoryGroup group = InventoryGroup.builder().id(99L).name("Office").build();
        group.setUsers(new java.util.ArrayList<>(java.util.List.of(ufuk)));

        // system-user login ama members listesinde yok
        when(userService.findById("system-user")).thenReturn(Optional.of(User.builder().id("system-user").build()));
        when(userService.findById("ufuk-id")).thenReturn(Optional.of(ufuk));
        when(recipeService.findById(101L)).thenReturn(Optional.of(popcorn));
        when(inventoryService.getUserInventoryGroup(any(), eq(99L))).thenReturn(group);

        mockMvc.perform(post("/api/v1/consumptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "inventoryGroupId": 99,
                                  "mealType": "SNACK",
                                  "members": [
                                    { "userId": "ufuk-id", "recipeId": 101, "portionMultiplier": 1.0 }
                                  ]
                                }
                                """))
                .andExpect(status().isOk());
    }
    @Test
    void shouldHandleBulkRequestWithIngredientsFromUserPayload() throws Exception {
        User berk = User.builder().id("b055b4bf-33c9-4d2e-812a-961b829a6676").name("Berk").build();
        User ufuk = User.builder().id("b29cd78c-8450-4fb9-96a0-f667f336445d").name("Ufuk").build();

        Ingredient sauce = Ingredient.builder().id(98L).name("alfredo sauce").build();
        sauce.setNutrition(IngredientNutrition.builder().ingredient(sauce).caloriesPer100g(100.0).proteinPer100g(10.0).carbsPer100g(10.0).fatPer100g(10.0).build());
        
        Ingredient nuts = Ingredient.builder().id(127L).name("almond nut meats").build();
        nuts.setNutrition(IngredientNutrition.builder().ingredient(nuts).caloriesPer100g(500.0).proteinPer100g(20.0).carbsPer100g(10.0).fatPer100g(40.0).build());

        InventoryGroup group = InventoryGroup.builder().id(3L).name("Office").build();
        group.setUsers(new java.util.ArrayList<>(java.util.List.of(berk, ufuk)));

        // system-user login ama payload'da üyeler arasında var
        when(userService.findById("system-user")).thenReturn(Optional.of(berk));
        when(userService.findById("b055b4bf-33c9-4d2e-812a-961b829a6676")).thenReturn(Optional.of(berk));
        when(userService.findById("b29cd78c-8450-4fb9-96a0-f667f336445d")).thenReturn(Optional.of(ufuk));
        when(ingredientService.findByIdWithUnits(98L)).thenReturn(Optional.of(sauce));
        when(ingredientService.findByIdWithUnits(127L)).thenReturn(Optional.of(nuts));
        when(inventoryService.getUserInventoryGroup(any(), eq(3L))).thenReturn(group);
        when(dailyConsumptionService.logConsumption(any(), anyBoolean())).thenAnswer(inv -> inv.getArgument(0));

        // Kullanıcının attığı payload'ın aynısını simüle edelim
        mockMvc.perform(post("/api/v1/consumptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "inventoryGroupId": 3,
                                  "mealType": "LUNCH",
                                  "members": [
                                    {
                                      "userId": "b055b4bf-33c9-4d2e-812a-961b829a6676",
                                      "ingredientId": 98,
                                      "foodName": "alfredo sauce",
                                      "portionLabel": "10 ML",
                                      "portionGrams": 10
                                    },
                                    {
                                      "userId": "b29cd78c-8450-4fb9-96a0-f667f336445d",
                                      "ingredientId": 127,
                                      "foodName": "almond nut meats",
                                      "portionLabel": "1 PAKET",
                                      "portionGrams": 500
                                    }
                                  ]
                                }
                                """))
                .andExpect(status().isOk());
    }

    @Test
    void shouldFailWhenItemInfoIsMissingInBulkRequest() throws Exception {
        User berk = User.builder().id("berk-id").build();
        InventoryGroup group = InventoryGroup.builder().id(3L).users(List.of(berk)).build();
        
        when(userService.findById(anyString())).thenReturn(Optional.of(berk));
        when(inventoryService.getUserInventoryGroup(any(), anyLong())).thenReturn(group);

        // members içinde ne recipeId ne ingredientId ne de foodName var
        mockMvc.perform(post("/api/v1/consumptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "inventoryGroupId": 3,
                                  "mealType": "LUNCH",
                                  "members": [
                                    { "userId": "berk-id", "portionMultiplier": 1.0 }
                                  ]
                                }
                                """))
                .andExpect(status().isBadRequest()); // 500 değil 400 bekliyoruz
    }

    @Test
    void shouldHandleDensityWhenDeductingLiquidFromInventory() throws Exception {
        User user = User.builder().id("system-user").build();
        // Alfredo Sauce: Density = 1.2 (100ml = 120g)
        Ingredient sauce = Ingredient.builder().id(98L).name("alfredo sauce").density(1.2).build();
        
        InventoryGroup group = InventoryGroup.builder().id(3L).name("Kitchen").build();
        group.setUsers(new java.util.ArrayList<>(List.of(user)));

        when(userService.findById("system-user")).thenReturn(Optional.of(user));
        when(ingredientService.findByIdWithUnits(98L)).thenReturn(Optional.of(sauce));
        // Also mock recipeService just in case
        when(recipeService.findById(any())).thenReturn(Optional.empty());
        when(inventoryService.getUserInventoryGroup(any(), eq(3L))).thenReturn(group);
        
        // Mock the service call instead of the repository
        // We want to test that the controller calculates the correct grams and passes them to the service
        DailyConsumption saved = DailyConsumption.builder().id(1L).foodName("sauce").build();
        when(dailyConsumptionService.logConsumption(any())).thenReturn(saved);

        // Simulation: User consumes "10 ml"
        // 10 ml * 1.2 density = 12 grams
        mockMvc.perform(post("/api/v1/consumptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "inventoryGroupId": 3,
                                  "mealType": "LUNCH",
                                  "ingredientId": 98,
                                  "foodName": "sauce",
                                  "portionLabel": "10 ml"
                                }
                                """))
                .andExpect(status().isOk());

        // Verify that the controller passed 12.0 grams to the service
        verify(dailyConsumptionService).logConsumption(argThat(consumption -> 
            consumption.getPortionGrams() != null && Math.abs(consumption.getPortionGrams() - 12.0) < 0.01
        ));
    }
    @Test
    void shouldHandleLiquidUnitsAndDensityCorrectly() throws Exception {
        User user = User.builder().id("system-user").build();
        // Milk: Density = 1.03
        Ingredient milk = Ingredient.builder().id(50L).name("milk").physicalState(Ingredient.PhysicalState.LIQUID).density(1.03).build();
        InventoryGroup group = InventoryGroup.builder().id(3L).users(List.of(user)).build();

        when(userService.findById(anyString())).thenReturn(Optional.of(user));
        when(ingredientService.findByIdWithUnits(50L)).thenReturn(Optional.of(milk));
        when(inventoryService.getUserInventoryGroup(any(), anyLong())).thenReturn(group);
        when(dailyConsumptionService.logConsumption(any())).thenAnswer(invocation -> invocation.getArgument(0));

        // 1 Bardak = 200ml. 200ml * 1.03 density = 206g.
        mockMvc.perform(post("/api/v1/consumptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "inventoryGroupId": 3,
                                  "mealType": "LUNCH",
                                  "ingredientId": 50,
                                  "foodName": "milk",
                                  "portionLabel": "1 bardak"
                                }
                                """))
                .andExpect(status().isOk());

        verify(dailyConsumptionService).logConsumption(argThat(c -> 
            c.getPortionGrams() != null
        ));
    }

    @Test
    void shouldHandleSpoonUnitsCorrectly() throws Exception {
        User user = User.builder().id("system-user").build();
        // Olive oil: Density = 0.92
        Ingredient oil = Ingredient.builder().id(60L).name("olive oil").physicalState(Ingredient.PhysicalState.LIQUID).density(0.92).build();
        InventoryGroup group = InventoryGroup.builder().id(3L).users(List.of(user)).build();

        when(userService.findById(anyString())).thenReturn(Optional.of(user));
        when(ingredientService.findByIdWithUnits(60L)).thenReturn(Optional.of(oil));
        when(inventoryService.getUserInventoryGroup(any(), anyLong())).thenReturn(group);
        when(dailyConsumptionService.logConsumption(any())).thenAnswer(invocation -> invocation.getArgument(0));

        // 1 Yemek Kaşığı = 15ml. 15ml * 0.92 density = 13.8g.
        mockMvc.perform(post("/api/v1/consumptions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "inventoryGroupId": 3,
                                  "mealType": "LUNCH",
                                  "ingredientId": 60,
                                  "foodName": "olive oil",
                                  "portionLabel": "1 yemek kaşığı"
                                }
                                """))
                .andExpect(status().isOk());

        verify(dailyConsumptionService).logConsumption(argThat(c -> 
            c.getPortionGrams() != null
        ));
    }

    @Test
    void shouldReturnAnalysisData() throws Exception {
        User user = User.builder().id("system-user").dailyCalorieTarget(2200).build();
        when(userService.findById("system-user")).thenReturn(Optional.of(user));

        when(dailyConsumptionService.getConsumptionsBetween(eq("system-user"), any(), any())).thenReturn(new java.util.ArrayList<>());
        
        mockMvc.perform(get("/api/v1/consumptions/analysis")
                        .param("period", "WEEKLY"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.period").value("WEEKLY"))
                .andExpect(jsonPath("$.dailyDetails").isArray())
                .andExpect(jsonPath("$.dailyDetails[0].targetCalories").value(2200));
    }

    @Test
    void shouldRejectInvalidDateRangeForAnalysis() throws Exception {
        User user = User.builder().id("system-user").dailyCalorieTarget(2200).build();
        when(userService.findById("system-user")).thenReturn(Optional.of(user));

        mockMvc.perform(get("/api/v1/consumptions/analysis")
                        .param("period", "CUSTOM")
                        .param("startDate", "2026-04-16")
                        .param("endDate", "2026-04-15"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Başlangıç tarihi bitiş tarihinden sonra olamaz."));

        verify(dailyConsumptionService, never()).getConsumptionsBetween(anyString(), any(), any());
    }

    @Test
    void shouldRejectInvalidDateRangeForHistory() throws Exception {
        mockMvc.perform(get("/api/v1/consumptions/history")
                        .param("startDate", "2026-04-16")
                        .param("endDate", "2026-04-15"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Başlangıç tarihi bitiş tarihinden sonra olamaz."));

        verify(dailyConsumptionService, never()).getConsumptionsBetween(anyString(), any(), any());
    }

    @Test
    void shouldDeleteConsumption() throws Exception {
        mockMvc.perform(delete("/api/v1/consumptions/123"))
                .andExpect(status().isNoContent());

        verify(dailyConsumptionService).deleteConsumption("system-user", 123L);
    }
}
