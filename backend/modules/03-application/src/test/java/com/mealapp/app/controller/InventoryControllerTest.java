package com.mealapp.app.controller;

import com.mealapp.app.model.dto.inventory.InventoryItemRequest;
import com.mealapp.domain.common.exception.MealAppDomainException;
import com.mealapp.domain.inventory.entity.Inventory;
import com.mealapp.domain.inventory.service.InventoryService;
import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.infrastructure.test.AbstractMockMvcTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.mealapp.domain.recipe.repository.IngredientRepository;
import com.mealapp.domain.recipe.entity.IngredientUnit;
import java.util.Optional;
import java.util.List;

class InventoryControllerTest extends AbstractMockMvcTest {

    @MockitoBean
    private InventoryService inventoryService;

    @MockitoBean
    private IngredientRepository ingredientRepository;

    @Test
    void shouldConvertUnitsToGramsWithIngredientContext() throws Exception {
        // Domates için 1 adet = 150g olsun (Özel birim)
        Ingredient ingredient = Ingredient.builder()
                .id(1L)
                .name("Domates")
                .build();
        
        IngredientUnit specialUnit = IngredientUnit.builder()
                .unitName("adet")
                .grams(150.0)
                .ingredient(ingredient)
                .build();
        
        ingredient.setIngredientUnits(List.of(specialUnit));

        Inventory inventory = Inventory.builder()
                .id(10L)
                .ingredient(ingredient)
                .quantity(150.0)
                .unit("g")
                .build();

        when(ingredientRepository.findById(1L)).thenReturn(Optional.of(ingredient));
        when(inventoryService.upsertInventoryItem(anyString(), anyLong(), anyLong(), anyDouble(), anyString(), any()))
                .thenReturn(inventory);

        // Test: 2 adet domates = 2 * 150 = 300g
        mockMvc.perform(post("/api/v1/inventory-groups/1/items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "ingredientId": 1,
                                  "quantity": 2,
                                  "unit": "adet"
                                }
                                """))
                .andExpect(status().isCreated());

        verify(inventoryService).upsertInventoryItem(
                eq("system-user"),
                eq(1L),
                eq(1L),
                eq(300.0), // 2 * 150
                eq("g"), // Artık 'adet' değil 'g' bekliyoruz
                eq(InventoryService.UpdateMode.SET)
        );
    }

    @Test
    void shouldConvertPaketToGramsWhenCreatingItem() throws Exception {
        Ingredient ingredient = Ingredient.builder().id(2L).name("Pirinç").build();
        Inventory inventory = Inventory.builder()
                .id(11L)
                .ingredient(ingredient)
                .quantity(5.0)
                .unit("g")
                .build();

        when(ingredientRepository.findById(2L)).thenReturn(Optional.of(ingredient));
        when(inventoryService.upsertInventoryItem(anyString(), anyLong(), anyLong(), anyDouble(), anyString(), any()))
                .thenReturn(inventory);

        // Test: 5 paket = 5 * 500 = 2500g
        mockMvc.perform(post("/api/v1/inventory-groups/1/items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "ingredientId": 2,
                                  "quantity": 5,
                                  "unit": "paket"
                                }
                                """))
                .andExpect(status().isCreated());

        verify(inventoryService).upsertInventoryItem(
                eq("system-user"),
                eq(1L),
                eq(2L),
                eq(2500.0), // 5 * 500
                eq("g"), // Artık 'paket' değil 'g' bekliyoruz
                eq(InventoryService.UpdateMode.SET)
        );
    }

    @Test
    void shouldConvertMlToGramsUsingDensity() throws Exception {
        // Süt için yoğunluk 1.03 g/ml olsun
        Ingredient milk = Ingredient.builder()
                .id(3L)
                .name("Süt")
                .density(1.03)
                .build();

        Inventory inventory = Inventory.builder()
                .id(12L)
                .ingredient(milk)
                .quantity(1030.0)
                .unit("g")
                .build();

        when(ingredientRepository.findById(3L)).thenReturn(Optional.of(milk));
        when(inventoryService.upsertInventoryItem(anyString(), anyLong(), anyLong(), anyDouble(), anyString(), any()))
                .thenReturn(inventory);

        // Test: 1000 ml süt = 1000 * 1.03 = 1030g
        mockMvc.perform(post("/api/v1/inventory-groups/1/items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "ingredientId": 3,
                                  "quantity": 1000,
                                  "unit": "ml"
                                }
                                """))
                .andExpect(status().isCreated());

        verify(inventoryService).upsertInventoryItem(
                eq("system-user"),
                eq(1L),
                eq(3L),
                eq(1030.0), // 1000 * 1.03
                eq("g"), // Süt katı (PhysicalState.SOLID default) kabul edildiği için 'g'
                eq(InventoryService.UpdateMode.SET)
        );
    }

    @Test
    void shouldUpdateInventoryItem() throws Exception {
        Ingredient ingredient = Ingredient.builder().id(1L).name("Domates").build();
        Inventory inventory = Inventory.builder()
                .id(10L)
                .ingredient(ingredient)
                .quantity(500.0)
                .unit("g")
                .build();

        when(ingredientRepository.findById(1L)).thenReturn(Optional.of(ingredient));
        when(inventoryService.updateInventoryItem(anyString(), anyLong(), anyLong(), anyLong(), anyDouble(), anyString(), any()))
                .thenReturn(inventory);

        mockMvc.perform(put("/api/v1/inventory-groups/1/items/10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "ingredientId": 1,
                                  "quantity": 500,
                                  "unit": "g"
                                }
                                """))
                .andExpect(status().isOk());

        verify(inventoryService).updateInventoryItem(
                eq("system-user"),
                eq(1L),
                eq(10L),
                eq(1L),
                eq(500.0),
                eq("g"),
                eq(InventoryService.UpdateMode.SET)
        );
    }

    @Test
    void shouldUpdateInventoryItemWithAddMode() throws Exception {
        Ingredient ingredient = Ingredient.builder().id(1L).name("Domates").build();
        Inventory inventory = Inventory.builder()
                .id(10L)
                .ingredient(ingredient)
                .quantity(2500.0)
                .unit("g")
                .build();

        when(ingredientRepository.findById(1L)).thenReturn(Optional.of(ingredient));
        when(inventoryService.updateInventoryItem(anyString(), anyLong(), anyLong(), anyLong(), anyDouble(), anyString(), any()))
                .thenReturn(inventory);

        mockMvc.perform(put("/api/v1/inventory-groups/1/items/10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "ingredientId": 1,
                                  "quantity": 500,
                                  "unit": "g",
                                  "updateMode": "ADD"
                                }
                                """))
                .andExpect(status().isOk());

        verify(inventoryService).updateInventoryItem(
                eq("system-user"),
                eq(1L),
                eq(10L),
                eq(1L),
                eq(500.0),
                eq("g"),
                eq(InventoryService.UpdateMode.ADD)
        );
    }
    @Test
    void shouldCreateInventoryItemWithMlUnitForLiquids() throws Exception {
        Ingredient ingredient = Ingredient.builder()
                .id(1L)
                .name("Alfredo Sauce")
                .density(1.1)
                .physicalState(Ingredient.PhysicalState.LIQUID)
                .build();
        Inventory inventory = Inventory.builder()
                .id(10L)
                .ingredient(ingredient)
                .quantity(433.0 * 1.1)
                .unit("ml")
                .build();

        when(ingredientRepository.findById(1L)).thenReturn(Optional.of(ingredient));
        when(inventoryService.upsertInventoryItem(anyString(), anyLong(), anyLong(), anyDouble(), anyString(), any()))
                .thenReturn(inventory);

        mockMvc.perform(post("/api/v1/inventory-groups/3/items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "ingredientId": 1,
                                  "quantity": 433,
                                  "unit": "ml"
                                }
                                """))
                .andExpect(status().isCreated());

        verify(inventoryService).upsertInventoryItem(
                eq("system-user"),
                eq(3L),
                eq(1L),
                eq(433.0), // Artık hacim (ml) bazlı saklıyoruz, kütle (476.3) değil.
                eq("ml"), // Liquid olduğu için ml
                eq(InventoryService.UpdateMode.SET)
        );
    }

    @Test
    void shouldCreateInventoryItemWithAddMode() throws Exception {
        Ingredient ingredient = Ingredient.builder().id(1L).name("Domates").build();
        Inventory inventory = Inventory.builder()
                .id(10L)
                .ingredient(ingredient)
                .quantity(1000.0)
                .unit("g")
                .build();

        when(ingredientRepository.findById(1L)).thenReturn(Optional.of(ingredient));
        when(inventoryService.upsertInventoryItem(anyString(), anyLong(), anyLong(), anyDouble(), anyString(), any()))
                .thenReturn(inventory);

        mockMvc.perform(post("/api/v1/inventory-groups/1/items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "ingredientId": 1,
                                  "quantity": 500,
                                  "unit": "g",
                                  "updateMode": "ADD"
                                }
                                """))
                .andExpect(status().isCreated());

        verify(inventoryService).upsertInventoryItem(
                eq("system-user"),
                eq(1L),
                eq(1L),
                eq(500.0),
                eq("g"),
                eq(InventoryService.UpdateMode.ADD)
        );
    }
}
