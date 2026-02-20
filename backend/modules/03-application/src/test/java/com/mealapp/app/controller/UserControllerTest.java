package com.mealapp.app.controller;

import com.mealapp.app.model.dto.user.UserDto;
import com.mealapp.app.model.mapper.user.UserMapper;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.user.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private UserMapper userMapper;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void shouldUpsertUser() throws Exception {
        UserDto userDto = new UserDto();
        userDto.setName("Test User");

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
        when(userService.findById(1L)).thenReturn(Optional.of(new User()));
        when(userMapper.toDto(any())).thenReturn(new UserDto());

        mockMvc.perform(get("/api/v1/users/1"))
                .andExpect(status().isOk());
    }
}
