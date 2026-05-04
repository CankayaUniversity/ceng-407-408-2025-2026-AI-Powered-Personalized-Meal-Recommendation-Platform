package com.mealapp.domain.inventory.service;

import com.mealapp.domain.inventory.entity.Inventory;
import com.mealapp.domain.inventory.entity.InventoryGroup;
import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.inventory.repository.InventoryGroupRepository;
import com.mealapp.domain.inventory.repository.InventoryRepository;
import com.mealapp.domain.recipe.repository.IngredientRepository;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InventoryServiceTest {

    @Mock
    private InventoryRepository inventoryRepository;
    @Mock
    private InventoryGroupRepository inventoryGroupRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private IngredientRepository ingredientRepository;
    @Mock
    private com.mealapp.domain.recipe.service.UnitConverterService unitConverterService;

    @InjectMocks
    private InventoryService inventoryService;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id("user-1")
                .email("user@example.com")
                .inventoryGroups(new ArrayList<>())
                .build();
    }

    @Test
    void shouldEnsureDefaultGroupCreatesBidirectionalLink() {
        // Given
        when(inventoryGroupRepository.findFirstByUsersIdOrderByIdAsc("user-1")).thenReturn(Optional.empty());
        when(userRepository.findById("user-1")).thenReturn(Optional.of(user));
        
        // When
        inventoryService.ensureUserHasDefaultGroup("user-1");

        // Then
        verify(inventoryGroupRepository).save(any(InventoryGroup.class));
        verify(userRepository).save(user);
        
        assertFalse(user.getInventoryGroups().isEmpty());
        assertEquals("Home", user.getInventoryGroups().get(0).getName());
        assertEquals(1, user.getInventoryGroups().get(0).getUsers().size());
        assertEquals(user, user.getInventoryGroups().get(0).getUsers().get(0));
    }

    @Test
    void shouldCreateGroupWithBidirectionalLink() {
        // Given
        when(userRepository.findById("user-1")).thenReturn(Optional.of(user));
        when(inventoryGroupRepository.existsByUsersIdAndNameIgnoreCase(anyString(), anyString())).thenReturn(false);
        
        // When
        inventoryService.createGroup("user-1", "Office", "office");

        // Then
        verify(inventoryGroupRepository).save(any(InventoryGroup.class));
        verify(userRepository).save(user);
        
        assertFalse(user.getInventoryGroups().isEmpty());
        assertEquals("Office", user.getInventoryGroups().get(0).getName());
        assertTrue(user.getInventoryGroups().get(0).getUsers().contains(user));
    }
    @Test
    void shouldConsumeMilkCorrectlyWithUnitConversion() {
        // Given
        Long ingredientId = 1L;
        Long groupId = 10L;
        String userId = "user-1";
        
        Ingredient milk = Ingredient.builder()
                .id(ingredientId)
                .name("Süt")
                .density(1.03)
                .build();
        
        Inventory milkStock = Inventory.builder()
                .id(100L)
                .ingredient(milk)
                .inventoryGroup(InventoryGroup.builder().id(groupId).name("Home").build())
                .quantity(2.0) // 2 Litre
                .unit("L")
                .build();

        when(ingredientRepository.findByIdWithUnits(ingredientId)).thenReturn(Optional.of(milk));
        when(inventoryGroupRepository.findByIdAndUsersIdWithUsers(groupId, userId))
                .thenReturn(Optional.of(milkStock.getInventoryGroup()));
        when(inventoryRepository.findByInventoryGroupUsersIdAndInventoryGroupIdAndIngredientId(userId, groupId, ingredientId))
                .thenReturn(Optional.of(milkStock));
        
        // Mock conversion: 2L -> 2000ml
        when(unitConverterService.convertUnits(milk, 2.0, "L", "ml")).thenReturn(2000.0);
        // Mock conversion for deduction: 700ml -> 0.7L
        when(unitConverterService.convertUnits(milk, 700.0, "ml", "L")).thenReturn(0.7);

        // When: Consume 700 ml
        inventoryService.consumeFromInventoryGroup(userId, groupId, ingredientId, 700.0, "ml");

        // Then
        assertEquals(1.3, milkStock.getQuantity(), 0.001); // 2.0 - 0.7 = 1.3 L
        verify(inventoryRepository).save(milkStock);
    }
    @Test
    void shouldConsumeMilkAcrossLocationsWithUnitConversion() {
        // Given
        Long ingredientId = 1L;
        String userId = "user-1";
        
        Ingredient milk = Ingredient.builder()
                .id(ingredientId)
                .name("Süt")
                .density(1.03)
                .build();
        
        Inventory homeMilk = Inventory.builder()
                .id(101L)
                .ingredient(milk)
                .quantity(0.5) // 0.5 Litre
                .unit("L")
                .build();

        Inventory officeMilk = Inventory.builder()
                .id(102L)
                .ingredient(milk)
                .quantity(1.0) // 1.0 Litre
                .unit("L")
                .build();

        List<Inventory> items = new ArrayList<>(List.of(homeMilk, officeMilk));

        when(ingredientRepository.findByIdWithUnits(ingredientId)).thenReturn(Optional.of(milk));
        when(inventoryRepository.findByInventoryGroupUsersIdAndIngredientIdOrderByInventoryGroupIdAsc(userId, ingredientId))
                .thenReturn(items);
        
        // Mock conversions for total check
        when(unitConverterService.convertUnits(milk, 0.5, "L", "ml")).thenReturn(500.0);
        when(unitConverterService.convertUnits(milk, 1.0, "L", "ml")).thenReturn(1000.0);
        
        // Mock conversion for deduction
        // First item: 500ml total available, deduct 500ml
        when(unitConverterService.convertUnits(milk, 0.5, "L", "ml")).thenReturn(500.0);
        // Second item: 1000ml available, deduct remaining 300ml
        when(unitConverterService.convertUnits(milk, 300.0, "ml", "L")).thenReturn(0.3);

        // When: Consume 800 ml total
        inventoryService.consumeFromInventory(userId, ingredientId, 800.0, "ml");

        // Then
        assertEquals(0.0, homeMilk.getQuantity());
        assertEquals(0.7, officeMilk.getQuantity(), 0.001); // 1.0 - 0.3 = 0.7
        verify(inventoryRepository).save(homeMilk);
        verify(inventoryRepository).save(officeMilk);
    }

    @Test
    void shouldUpsertItemWithUnitConversionInAddMode() {
        // Given
        Long ingredientId = 1L;
        Long groupId = 10L;
        String userId = "user-1";

        Ingredient flour = Ingredient.builder().id(ingredientId).name("Un").build();
        InventoryGroup group = InventoryGroup.builder().id(groupId).name("Home").build();
        Inventory existingFlour = Inventory.builder()
                .ingredient(flour)
                .quantity(1.0)
                .unit("kg")
                .build();

        when(inventoryGroupRepository.findByIdAndUsersId(groupId, userId)).thenReturn(Optional.of(group));
        when(ingredientRepository.findByIdWithUnits(ingredientId)).thenReturn(Optional.of(flour));
        when(inventoryRepository.findByInventoryGroupUsersIdAndInventoryGroupIdAndIngredientId(userId, groupId, ingredientId))
                .thenReturn(Optional.of(existingFlour));

        // Adding 500g to 1kg stock. 500g -> 0.5kg
        when(unitConverterService.convertUnits(flour, 500.0, "g", "kg")).thenReturn(0.5);

        // When
        inventoryService.upsertInventoryItem(userId, groupId, ingredientId, 500.0, "g", InventoryService.UpdateMode.ADD);

        // Then
        assertEquals(1.5, existingFlour.getQuantity());
        assertEquals("kg", existingFlour.getUnit()); // Unit should remain kg
        verify(inventoryRepository).save(existingFlour);
    }

    @Test
    void shouldUpdateItemWithUnitConversionInSubtractMode() {
        // Given
        Long itemId = 100L;
        Long ingredientId = 1L;
        Long groupId = 10L;
        String userId = "user-1";

        Ingredient garlic = Ingredient.builder().id(ingredientId).name("Sarımsak").build();
        Inventory existingGarlic = Inventory.builder()
                .id(itemId)
                .ingredient(garlic)
                .quantity(10.0)
                .unit("diş")
                .build();

        when(inventoryRepository.findByIdAndInventoryGroupUsersIdAndInventoryGroupId(itemId, userId, groupId))
                .thenReturn(Optional.of(existingGarlic));
        when(ingredientRepository.findByIdWithUnits(ingredientId)).thenReturn(Optional.of(garlic));

        // Subtracting 1 "baş" from 10 "diş". Assume 1 baş = 10 diş for this test mock.
        when(unitConverterService.convertUnits(garlic, 1.0, "baş", "diş")).thenReturn(10.0);

        // When
        inventoryService.updateInventoryItem(userId, groupId, itemId, ingredientId, 1.0, "baş", InventoryService.UpdateMode.SUBTRACT);

        // Then
        assertEquals(0.0, existingGarlic.getQuantity());
        assertEquals("diş", existingGarlic.getUnit());
        verify(inventoryRepository).save(existingGarlic);
    }
}
