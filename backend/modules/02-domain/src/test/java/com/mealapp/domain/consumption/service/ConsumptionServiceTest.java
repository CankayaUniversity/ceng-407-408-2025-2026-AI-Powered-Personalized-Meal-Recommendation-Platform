package com.mealapp.domain.consumption.service;

import com.mealapp.domain.common.exception.MealAppDomainException;
import com.mealapp.domain.consumption.entity.DailyConsumption;
import com.mealapp.domain.inventory.entity.Inventory;
import com.mealapp.domain.inventory.entity.InventoryGroup;
import com.mealapp.domain.inventory.repository.InventoryRepository;
import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ConsumptionServiceTest {

    @Mock
    private InventoryRepository inventoryRepository;

    @Mock
    private DailyConsumptionService dailyConsumptionService;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ConsumptionService consumptionService;

    private User user;
    private Inventory inventory;
    private Ingredient ingredient;
    private InventoryGroup inventoryGroup;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId("user-1");

        ingredient = Ingredient.builder()
                .id(1L)
                .name("Tomato")
                .build();

        inventoryGroup = InventoryGroup.builder()
                .id(10L)
                .build();

        inventory = Inventory.builder()
                .id(100L)
                .ingredient(ingredient)
                .inventoryGroup(inventoryGroup)
                .quantity(10.0)
                .build();
    }

    @Test
    void consume_ShouldDeductFromInventoryOnce() {
        // Arrange
        Long itemId = 100L;
        Map<String, Double> userAmounts = Map.of("user-1", 2.0);
        
        when(inventoryRepository.findById(itemId)).thenReturn(Optional.of(inventory));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(user));

        // Act
        consumptionService.consume(itemId, userAmounts);

        // Assert
        // 1. Stoktan düşüldüğünü doğrula (10.0 - 2.0 = 8.0)
        assertEquals(8.0, inventory.getQuantity());
        verify(inventoryRepository).save(inventory);

        // 2. logConsumption'ın deductFromInventory=false (ikinci parametre) ile çağrıldığını doğrula
        verify(dailyConsumptionService).logConsumption(any(DailyConsumption.class), eq(false));
    }

    @Test
    void consume_ShouldRejectInvalidAmounts() {
        Long itemId = 100L;
        Map<String, Double> userAmounts = Map.of("user-1", 0.0);

        when(inventoryRepository.findById(itemId)).thenReturn(Optional.of(inventory));

        MealAppDomainException exception = assertThrows(
                MealAppDomainException.class,
                () -> consumptionService.consume(itemId, userAmounts)
        );

        assertEquals("Her kullanıcı için 0'dan büyük geçerli bir tüketim miktarı girilmelidir.", exception.getMessage());
        verify(inventoryRepository, never()).save(any());
        verify(dailyConsumptionService, never()).logConsumption(any(DailyConsumption.class), anyBoolean());
    }

    @Test
    void consume_ShouldConvertLiquidAmountsToGramsForConsumptionLog() {
        Long itemId = 100L;
        ingredient.setPhysicalState(Ingredient.PhysicalState.LIQUID);
        ingredient.setDensity(1.2);
        Map<String, Double> userAmounts = Map.of("user-1", 10.0);

        when(inventoryRepository.findById(itemId)).thenReturn(Optional.of(inventory));
        when(userRepository.findById("user-1")).thenReturn(Optional.of(user));

        consumptionService.consume(itemId, userAmounts);

        verify(dailyConsumptionService).logConsumption(
                argThat(consumption -> consumption.getPortionGrams() != null && consumption.getPortionGrams().equals(12.0)),
                eq(false)
        );
    }
}
