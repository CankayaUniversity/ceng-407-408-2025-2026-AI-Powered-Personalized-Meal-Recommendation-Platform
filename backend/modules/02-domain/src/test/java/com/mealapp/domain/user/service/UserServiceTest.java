package com.mealapp.domain.user.service;

import com.mealapp.domain.user.dto.UserSyncRequest;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id("user123")
                .email("test@example.com")
                .name("Test User")
                .role(User.UserRole.USER)
                .active(true)
                .build();
    }

    @Test
    void whenSyncUser_andUserNotExists_thenCreateUser() {
        UserSyncRequest request = new UserSyncRequest("user123", "test@example.com", "Test User", List.of("user"));
        
        when(userRepository.findById("user123")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User syncedUser = userService.syncUser(request);

        assertNotNull(syncedUser);
        assertEquals("user123", syncedUser.getId());
        assertEquals(User.UserRole.USER, syncedUser.getRole());
        assertTrue(syncedUser.isActive());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void whenSyncUser_andUserExistsAsAdmin_thenUpdateToAdmin() {
        UserSyncRequest request = new UserSyncRequest("user123", "test@example.com", "Test User", List.of("admin"));
        
        when(userRepository.findById("user123")).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User syncedUser = userService.syncUser(request);

        assertEquals(User.UserRole.ADMIN, syncedUser.getRole());
        verify(userRepository).save(testUser);
    }

    @Test
    void whenDeleteUser_thenInvokeSoftDelete() {
        userService.delete(testUser);
        verify(userRepository).softDelete("user123");
    }

    @Test
    void whenFindById_thenReturnOnlyActiveUser() {
        when(userRepository.findByIdAndActiveTrue("user123")).thenReturn(Optional.of(testUser));
        
        Optional<User> found = userService.findById("user123");
        
        assertTrue(found.isPresent());
        verify(userRepository).findByIdAndActiveTrue("user123");
    }
}
