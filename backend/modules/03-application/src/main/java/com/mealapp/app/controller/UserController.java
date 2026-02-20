package com.mealapp.app.controller;

import com.mealapp.app.model.dto.user.UserDto;
import com.mealapp.app.model.mapper.user.UserMapper;
import com.mealapp.domain.common.exception.ResourceNotFoundException;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * Kullanıcı profil yönetimi için temel uç noktalar.
 * Not: Günlük kalori hedefi kullanıcıdan alınmaz; profil bilgilerinden otomatik hesaplanır.
 */
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final UserMapper userMapper;

    /**
     * Kullanıcı oluşturur veya günceller.
     * - Body'deki fiziksel verilerden günlük kalori hedefi sunucu tarafında hesaplanır.
     */
    @PostMapping
    public UserDto upsert(@RequestBody UserDto request) {
        User toSave = userMapper.toEntity(request); // dailyCalorieTarget burada hesaplanır
        User saved = userService.save(toSave);
        return userMapper.toDto(saved);
    }

    /**
     * Kullanıcı profili getirir.
     */
    @GetMapping("/{id}")
    public UserDto get(@PathVariable Long id) {
        User user = userService.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı ID: " + id));
        return userMapper.toDto(user);
    }
}
