package com.mealapp.app.controller;

import com.mealapp.app.model.dto.user.UserDto;
import com.mealapp.app.model.mapper.user.UserMapper;
import com.mealapp.domain.common.exception.MealAppDomainException;
import com.mealapp.domain.common.exception.ResourceNotFoundException;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.user.service.UserService;
import com.mealapp.domain.user.util.CalorieCalculator;
import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;
import org.springframework.dao.DataIntegrityViolationException;
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
    public UserDto upsert(@Valid @RequestBody UserDto request) {
        try {
            return performUpsert(request);
        } catch (DataIntegrityViolationException e) {
            // Race condition: another thread created the user between our check and save
            // Try one more time to find and update
            return performUpsert(request);
        }
    }

    private UserDto performUpsert(UserDto request) {
        // 1. Check by ID (Keycloak sub) - Primary anchor
        User existingById = userService.findById(request.getId()).orElse(null);

        if (existingById != null) {
            // ID found: Update fields (Normal update flow)
            updateUserFields(existingById, request);
            User saved = userService.save(existingById);
            return userMapper.toDto(saved);
        }

        // 2. ID not found: Check if Email is already in use by another ID
        User existingByEmail = userService.findByEmail(request.getEmail()).orElse(null);

        if (existingByEmail != null) {
            throw new MealAppDomainException("Bu e-posta adresi (" + request.getEmail() + ") başka bir hesapla ilişkilendirilmiş.");
        }

        // 3. New user: Create with the ID from request
        User newUser = userMapper.toEntity(request);
        newUser.setId(request.getId());
        User saved = userService.save(newUser);
        return userMapper.toDto(saved);
    }

    private void updateUserFields(User existing, UserDto request) {
        if (request.getName() != null) existing.setName(request.getName());
        if (request.getEmail() != null) existing.setEmail(request.getEmail());
        if (request.getWeight() != null) existing.setWeight(request.getWeight());
        if (request.getHeight() != null) existing.setHeight(request.getHeight());
        if (request.getAge() != null) existing.setAge(request.getAge());
        if (request.getGender() != null) existing.setGender(request.getGender());
        if (request.getActivityLevel() != null) existing.setActivityLevel(request.getActivityLevel());
        if (request.getDietType() != null) existing.setDietType(request.getDietType());
        if (request.getDietaryGoal() != null) existing.setDietaryGoal(request.getDietaryGoal());
        if (request.getAllergies() != null) existing.setAllergies(request.getAllergies());
        existing.setDailyCalorieTarget(CalorieCalculator.calculateDailyTarget(existing));
    }

    /**
     * Kullanıcı profili getirir.
     */
    @GetMapping("/{id}")
    public UserDto get(@PathVariable String id) {
        User user = userService.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı ID: " + id));
        return userMapper.toDto(user);
    }
}
