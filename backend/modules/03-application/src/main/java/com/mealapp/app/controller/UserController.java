package com.mealapp.app.controller;

import com.mealapp.domain.inventory.service.InventoryInvitationService;
import com.mealapp.app.model.dto.user.UserDto;
import com.mealapp.app.model.mapper.user.UserMapper;
import com.mealapp.domain.common.exception.MealAppDomainException;
import com.mealapp.domain.common.exception.ResourceNotFoundException;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.user.service.UserService;
import com.mealapp.domain.user.util.CalorieCalculator;
import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Locale;

/**
 * Kullanıcı profil yönetimi için temel uç noktalar.
 * Not: Günlük kalori hedefi kullanıcıdan alınmaz; profil bilgilerinden otomatik hesaplanır.
 */
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final UserService userService;
    private final UserMapper userMapper;
    private final InventoryInvitationService invitationService;

    /**
     * Kullanıcı oluşturur veya günceller.
     * - Body'deki fiziksel verilerden günlük kalori hedefi sunucu tarafında hesaplanır.
     */
    @PostMapping
    public UserDto upsert(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody UserDto request) {
        try {
            return performUpsert(jwt, request);
        } catch (DataIntegrityViolationException e) {
            // Race condition: another thread created the user between our check and save
            // Try one more time to find and update
            return performUpsert(jwt, request);
        }
    }

    private UserDto performUpsert(Jwt jwt, UserDto request) {
        String authenticatedUserId = requireAuthenticatedUserId(jwt);
        assertSameUser(authenticatedUserId, request.getId());

        String authenticatedEmail = resolveAuthenticatedEmail(jwt, request.getEmail());
        request.setId(authenticatedUserId);
        request.setEmail(authenticatedEmail);

        // 1. Check by ID (Keycloak sub) - Primary anchor
        User existingById = userService.findById(authenticatedUserId).orElse(null);

        if (existingById != null) {
            // ID found: Update fields (Normal update flow)
            updateUserFields(existingById, request, authenticatedEmail);
            User saved = userService.save(existingById);
            return userMapper.toDto(saved);
        }

        // 2. ID not found: Try to relink an existing record by authenticated e-mail first.
        if (authenticatedEmail != null) {
            User existingByEmail = userService.findByEmail(authenticatedEmail).orElse(null);
            if (existingByEmail != null) {
                log.info("Relinking user profile from legacy Keycloak subject {} to {}", existingByEmail.getId(), authenticatedUserId);
                userService.relinkUserId(existingByEmail.getId(), authenticatedUserId);

                User relinkedUser = userService.findById(authenticatedUserId)
                        .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı relink işleminden sonra bulunamadı ID: " + authenticatedUserId));

                updateUserFields(relinkedUser, request, authenticatedEmail);
                User saved = userService.save(relinkedUser);
                return userMapper.toDto(saved);
            }
        }

        // 3. New user: Create with the ID from request
        User newUser = userMapper.toEntity(request);
        newUser.setId(authenticatedUserId);
        newUser.setEmail(authenticatedEmail);
        User saved = userService.save(newUser);
        
        // Yeni kullanıcı için bekleyen davetleri bildirime dönüştür
        invitationService.createNotificationsForPendingInvitations(saved);
        
        UserDto dto = userMapper.toDto(saved);
        if (dto.getProfileImageUrl() != null) {
            dto.setProfileImageUrl(userService.getProfileImageUrl(dto.getProfileImageUrl()));
        }
        return dto;
    }

    private void updateUserFields(User existing, UserDto request, String authenticatedEmail) {
        if (request.getName() != null) existing.setName(request.getName());
        if (authenticatedEmail != null) {
            existing.setEmail(authenticatedEmail);
        } else if (request.getEmail() != null) {
            existing.setEmail(request.getEmail());
        }
        if (request.getWeight() != null) existing.setWeight(request.getWeight());
        if (request.getHeight() != null) existing.setHeight(request.getHeight());
        if (request.getAge() != null) existing.setAge(request.getAge());
        if (request.getGender() != null) existing.setGender(request.getGender());
        if (request.getActivityLevel() != null) existing.setActivityLevel(request.getActivityLevel());
        if (request.getDietType() != null) existing.setDietType(request.getDietType());
        if (request.getDietaryGoal() != null) existing.setDietaryGoal(request.getDietaryGoal());
        if (request.getAllergies() != null) existing.setAllergies(request.getAllergies());
        if (request.getDislikedIngredients() != null) existing.setDislikedIngredients(request.getDislikedIngredients());
        existing.setDailyCalorieTarget(CalorieCalculator.calculateDailyTarget(existing));
    }

    /**
     * Kullanıcı profil fotoğrafını yükler.
     */
    @PostMapping("/{id}/profile-image")
    @SneakyThrows
    public UserDto uploadProfileImage(@PathVariable String id,
                                      @RequestParam("file") MultipartFile file,
                                      @AuthenticationPrincipal Jwt jwt) {
        String authenticatedUserId = requireAuthenticatedUserId(jwt);
        assertSameUser(authenticatedUserId, id);

        if (file.isEmpty()) {
            throw new MealAppDomainException("Yüklenecek dosya bulunamadı.");
        }

        String fileName = userService.uploadProfileImage(
                authenticatedUserId,
                file.getInputStream(),
                file.getOriginalFilename(),
                file.getContentType()
        );

        User user = userService.findById(authenticatedUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı ID: " + authenticatedUserId));

        return userMapper.toDto(user);
    }

    /**
     * Kullanıcı profili getirir.
     */
    @GetMapping("/{id}")
    public UserDto get(@PathVariable String id, @AuthenticationPrincipal Jwt jwt) {
        String authenticatedUserId = requireAuthenticatedUserId(jwt);
        assertSameUser(authenticatedUserId, id);

        User user = userService.findById(authenticatedUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı ID: " + authenticatedUserId));
        
        UserDto dto = userMapper.toDto(user);
        if (dto.getProfileImageUrl() != null) {
            dto.setProfileImageUrl(userService.getProfileImageUrl(dto.getProfileImageUrl()));
        }
        return dto;
    }

    /**
     * Kullanıcı arama (İsim veya E-posta).
     */
    @GetMapping("/search")
    public java.util.List<UserDto> search(@RequestParam String query) {
        return userService.searchUsers(query).stream()
                .map(userMapper::toDto)
                .toList();
    }

    private String requireAuthenticatedUserId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null || jwt.getSubject().isBlank()) {
            throw new MealAppDomainException("Kimliği doğrulanmış kullanıcı bilgisi bulunamadı.");
        }

        return jwt.getSubject();
    }

    private void assertSameUser(String authenticatedUserId, String requestedUserId) {
        if (!authenticatedUserId.equals(requestedUserId)) {
            throw new MealAppDomainException("İstek yapılan kullanıcı kimliği oturumdaki kullanıcı ile eşleşmiyor.");
        }
    }

    private String resolveAuthenticatedEmail(Jwt jwt, String requestEmail) {
        String tokenEmail = normalizeEmail(jwt != null ? jwt.getClaimAsString("email") : null);
        String normalizedRequestEmail = normalizeEmail(requestEmail);

        if (tokenEmail != null && normalizedRequestEmail != null && !tokenEmail.equals(normalizedRequestEmail)) {
            throw new MealAppDomainException("İstek gövdesindeki e-posta oturumdaki kullanıcı ile eşleşmiyor.");
        }

        return tokenEmail != null ? tokenEmail : normalizedRequestEmail;
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            return null;
        }

        return email.trim().toLowerCase(Locale.ROOT);
    }
}
