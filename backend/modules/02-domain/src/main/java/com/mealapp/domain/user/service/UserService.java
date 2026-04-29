package com.mealapp.domain.user.service;

import com.mealapp.domain.user.dto.UserSyncRequest;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;

/**
 * Kullanıcı iş mantığını yöneten servis.
 * Profil oluşturma, tercih güncellenme ve kullanıcı sorgulama işlemlerini yapar.
 */
@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class UserService {

    private final UserRepository userRepository;

    /**
     * Yeni bir kullanıcı kaydeder veya mevcut kullanıcıyı günceller.
     */
    public User save(User user) {
        return userRepository.save(user);
    }

    /**
     * E-posta adresine göre aktif kullanıcı bulur.
     */
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmailAndActiveTrue(email);
    }

    /**
     * ID'ye göre aktif kullanıcı detaylarını getirir.
     */
    public Optional<User> findById(String id) {
        return userRepository.findByIdAndActiveTrue(id);
    }

    /**
     * İsim veya e-postaya göre kullanıcı arar.
     */
    public java.util.List<User> searchUsers(String query) {
        if (query == null || query.length() < 2) {
            return java.util.Collections.emptyList();
        }
        return userRepository.searchByQuery(query);
    }

    /**
     * Keycloak subject değiştiğinde mevcut kullanıcı kaydını yeni subject ile ilişkilendirir.
     */
    public void relinkUserId(String oldId, String newId) {
        if (oldId == null || newId == null || oldId.equals(newId)) {
            return;
        }

        int updatedRows = userRepository.relinkUserId(oldId, newId);
        if (updatedRows == 0) {
            throw new IllegalArgumentException("Relink edilecek kullanıcı bulunamadı: " + oldId);
        }

        userRepository.flush();
    }

    /**
     * Kullanıcıyı soft delete ile pasif duruma getirir.
     */
    public void delete(User user) {
        if (user != null && user.getId() != null) {
            userRepository.softDelete(user.getId());
        }
    }

    /**
     * Keycloak'tan gelen kullanıcı verilerini senkronize eder.
     */
    public User syncUser(UserSyncRequest request) {
        log.info("Kullanıcı senkronize ediliyor: {}", request.email());
        
        User.UserRole role = request.roles().stream()
                .anyMatch(r -> r.equalsIgnoreCase("admin"))
                ? User.UserRole.ADMIN
                : User.UserRole.USER;

        return userRepository.findById(request.keycloakId())
                .map(user -> {
                    user.setEmail(request.email());
                    user.setName(request.name());
                    user.setRole(role);
                    user.setActive(true);
                    return userRepository.save(user);
                })
                .orElseGet(() -> {
                    User newUser = User.builder()
                            .id(request.keycloakId())
                            .email(request.email())
                            .name(request.name())
                            .role(role)
                            .active(true)
                            .build();
                    return userRepository.save(newUser);
                });
    }

    /**
     * Kullanıcının diyet tercihlerini veya alerjilerini günceller.
     */
    public User updatePreferences(String id, User.DietType dietType, java.util.List<String> allergies) {
        return userRepository.findById(id)
                .map(user -> {
                    user.setDietType(dietType);
                    user.setAllergies(allergies);
                    return userRepository.save(user);
                })
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı: " + id));
    }
}
