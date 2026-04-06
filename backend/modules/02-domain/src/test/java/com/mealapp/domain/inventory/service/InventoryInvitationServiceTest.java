package com.mealapp.domain.inventory.service;

import com.mealapp.domain.common.exception.MealAppDomainException;
import com.mealapp.domain.common.exception.ResourceNotFoundException;
import com.mealapp.domain.inventory.entity.InventoryGroup;
import com.mealapp.domain.inventory.entity.InventoryInvitation;
import com.mealapp.domain.inventory.repository.InventoryGroupRepository;
import com.mealapp.domain.inventory.repository.InventoryInvitationRepository;
import com.mealapp.domain.notification.entity.Notification;
import com.mealapp.domain.notification.service.NotificationService;
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
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InventoryInvitationServiceTest {

    @Mock
    private InventoryInvitationRepository invitationRepository;
    @Mock
    private InventoryGroupRepository groupRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private InventoryInvitationService invitationService;

    private User inviter;
    private InventoryGroup group;

    @BeforeEach
    void setUp() {
        inviter = User.builder()
                .id("user-1")
                .email("inviter@example.com")
                .name("Inviter")
                .inventoryGroups(new ArrayList<>())
                .build();

        group = InventoryGroup.builder()
                .id(1L)
                .name("Test Group")
                .users(new ArrayList<>(List.of(inviter)))
                .build();
        
        inviter.getInventoryGroups().add(group);
    }

    @Test
    void shouldInviteUserSuccessfully() {
        // Given
        when(userRepository.findById("user-1")).thenReturn(Optional.of(inviter));
        when(groupRepository.findById(1L)).thenReturn(Optional.of(group));
        when(invitationRepository.findByInviteeEmailAndInventoryGroupId(anyString(), anyLong())).thenReturn(new ArrayList<>());
        
        InventoryInvitation savedInvitation = InventoryInvitation.builder()
                .id(100L)
                .inviter(inviter)
                .inventoryGroup(group)
                .inviteeEmail("invitee@example.com")
                .status(InventoryInvitation.InvitationStatus.PENDING)
                .build();
        
        when(invitationRepository.saveAndFlush(any())).thenReturn(savedInvitation);
        when(userRepository.findByEmail("invitee@example.com")).thenReturn(Optional.of(User.builder().id("user-2").email("invitee@example.com").build()));

        // When
        InventoryInvitation result = invitationService.inviteUser("user-1", "inviter@example.com", 1L, "invitee@example.com");

        // Then
        assertNotNull(result);
        assertEquals(100L, result.getId());
        verify(notificationService).createNotification(any(), anyString(), anyString(), any(), eq("100"));
    }

    @Test
    void shouldDeleteExistingInvitationsWhenResending() {
        // Given
        when(userRepository.findById("user-1")).thenReturn(Optional.of(inviter));
        when(groupRepository.findById(1L)).thenReturn(Optional.of(group));
        
        InventoryInvitation existing = InventoryInvitation.builder().id(50L).build();
        when(invitationRepository.findByInviteeEmailAndInventoryGroupId("invitee@example.com", 1L))
                .thenReturn(new ArrayList<>(List.of(existing)));
        
        InventoryInvitation savedInvitation = InventoryInvitation.builder()
                .id(101L)
                .inviter(inviter)
                .inventoryGroup(group)
                .inviteeEmail("invitee@example.com")
                .status(InventoryInvitation.InvitationStatus.PENDING)
                .build();
        
        when(invitationRepository.saveAndFlush(any())).thenReturn(savedInvitation);

        // When
        InventoryInvitation result = invitationService.inviteUser("user-1", "inviter@example.com", 1L, "invitee@example.com");

        // Then
        assertNotNull(result);
        assertEquals(101L, result.getId());
        verify(invitationRepository).deleteAll(anyList());
        verify(invitationRepository).flush();
    }

    @Test
    void shouldThrowExceptionWhenInviterNotFound() {
        // Given
        when(userRepository.findById("user-1")).thenReturn(Optional.empty());

        // When & Then
        MealAppDomainException exception = assertThrows(MealAppDomainException.class, () -> 
            invitationService.inviteUser("user-1", "inviter@example.com", 1L, "invitee@example.com")
        );
        assertTrue(exception.getMessage().contains("Davet eden kullanıcı sistemde bulunamadı"));
    }

    @Test
    void shouldThrowExceptionWhenGroupNotFound() {
        // Given
        when(userRepository.findById("user-1")).thenReturn(Optional.of(inviter));
        when(groupRepository.findById(1L)).thenReturn(Optional.empty());

        // When & Then
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> 
            invitationService.inviteUser("user-1", "inviter@example.com", 1L, "invitee@example.com")
        );
        assertTrue(exception.getMessage().contains("Envanter grubu bulunamadı"));
    }

    @Test
    void shouldThrowExceptionWhenAlreadyMember() {
        // Given
        User invitee = User.builder().id("user-2").email("invitee@example.com").build();
        group.getUsers().add(invitee);
        
        when(userRepository.findById("user-1")).thenReturn(Optional.of(inviter));
        when(groupRepository.findById(1L)).thenReturn(Optional.of(group));

        // When & Then
        MealAppDomainException exception = assertThrows(MealAppDomainException.class, () -> 
            invitationService.inviteUser("user-1", "inviter@example.com", 1L, "invitee@example.com")
        );
        assertEquals("'invitee@example.com' kullanıcısı zaten 'Test Group' grubunun üyesi.", exception.getMessage());
    }
}
