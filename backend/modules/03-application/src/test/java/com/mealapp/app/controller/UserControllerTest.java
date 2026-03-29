package com.mealapp.app.controller;

import com.mealapp.app.model.dto.user.UserDto;
import com.mealapp.app.model.mapper.user.UserMapper;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.user.service.UserService;
import com.mealapp.infrastructure.test.AbstractMockMvcTest;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class UserControllerTest extends AbstractMockMvcTest {

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private UserMapper userMapper;

    @Test
    void shouldUpsertUser() throws Exception {
        UserDto userDto = new UserDto();
        userDto.setId("system-user");
        userDto.setName("Test User");
        userDto.setEmail("system@mealapp.local");
        userDto.setWeight(70.0);
        userDto.setHeight(175.0);
        userDto.setAge(25);
        userDto.setGender(User.Gender.MALE);
        userDto.setActivityLevel(User.ActivityLevel.MODERATELY_ACTIVE);
        userDto.setDislikedIngredients(List.of("Cilantro", "Celery"));

        when(userService.findById("system-user")).thenReturn(Optional.empty());
        when(userService.findByEmail("system@mealapp.local")).thenReturn(Optional.empty());
        when(userMapper.toEntity(any())).thenReturn(new User());
        when(userService.save(any())).thenReturn(new User());
        when(userMapper.toDto(any())).thenReturn(new UserDto());

        mockMvc.perform(post("/api/v1/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(userDto)))
                .andExpect(status().isOk());
    }

    @Test
    void shouldGetUser() throws Exception {
        when(userService.findById("system-user")).thenReturn(Optional.of(new User()));
        when(userMapper.toDto(any())).thenReturn(new UserDto());

        mockMvc.perform(get("/api/v1/users/system-user"))
                .andExpect(status().isOk());
    }

    @Test
    void shouldRelinkUserWhenEmailMatchesAuthenticatedUser() throws Exception {
        UserDto userDto = new UserDto();
        userDto.setId("new-sub");
        userDto.setName("Test User");
        userDto.setEmail("user@example.com");

        User relinkedUser = new User();
        relinkedUser.setId("new-sub");
        relinkedUser.setEmail("user@example.com");

        when(userService.findById("new-sub"))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(relinkedUser));
        when(userService.findByEmail("user@example.com")).thenReturn(Optional.of(User.builder()
                .id("legacy-sub")
                .email("user@example.com")
                .build()));
        when(userService.save(any())).thenReturn(relinkedUser);
        when(userMapper.toDto(any())).thenReturn(new UserDto());

        mockMvc.perform(post("/api/v1/users")
                        .with(jwtFor("new-sub", "user@example.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(userDto)))
                .andExpect(status().isOk());

        verify(userService).relinkUserId("legacy-sub", "new-sub");
    }

    @Test
    void shouldRejectGetForAnotherUser() throws Exception {
        mockMvc.perform(get("/api/v1/users/another-user"))
                .andExpect(status().isBadRequest());
    }

    private SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor jwtFor(String sub, String email) {
        Jwt jwtToken = Jwt.withTokenValue("token")
                .header("alg", "none")
                .claim(JwtClaimNames.SUB, sub)
                .claim("email", email)
                .build();

        return jwt()
                .jwt(jwtToken)
                .authorities(new SimpleGrantedAuthority("ROLE_USER"));
    }
}
