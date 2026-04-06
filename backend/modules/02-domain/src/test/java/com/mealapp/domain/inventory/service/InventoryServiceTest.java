package com.mealapp.domain.inventory.service;

import com.mealapp.domain.inventory.entity.InventoryGroup;
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
}
