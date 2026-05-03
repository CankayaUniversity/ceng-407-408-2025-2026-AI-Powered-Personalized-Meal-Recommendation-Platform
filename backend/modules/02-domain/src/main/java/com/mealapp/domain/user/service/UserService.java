package com.mealapp.domain.user.service;

import com.mealapp.domain.common.storage.FileStorageService;
import com.mealapp.domain.user.dto.UserSyncRequest;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import org.springframework.transaction.annotation.Transactional;
import java.io.InputStream;
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
    private final FileStorageService fileStorageService;

    public String getFileStorageServiceUrl(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return null;
        }
        return fileStorageService.getFileUrl(fileName);
    }

    /**
     * Kullanıcının profil fotoğrafını yükler ve URL'ini günceller.
     */
    public String uploadProfileImage(String userId, InputStream inputStream, String originalFilename, String contentType) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı: " + userId));

        // Dosya adı formatı: users/{userId}/profile_{timestamp}.{ext}
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        String fileName = String.format("users/%s/profile_%d%s", userId, System.currentTimeMillis(), extension);

        // Eski fotoğrafı sil (opsiyonel ama temizlik için iyi olur)
        if (user.getProfileImageUrl() != null) {
            try {
                fileStorageService.deleteFile(user.getProfileImageUrl());
            } catch (Exception e) {
                log.warn("Eski profil fotoğrafı silinemedi: {}", user.getProfileImageUrl(), e);
            }
        }

        String uploadedFileName = fileStorageService.uploadFile(inputStream, fileName, contentType);
        user.setProfileImageUrl(uploadedFileName);
        userRepository.save(user);

        return uploadedFileName;
    }

    /**
     * Kullanıcı profil fotoğrafı için geçici URL üretir.
     */
    public String getProfileImageUrl(String fileName) {
        return getFileStorageServiceUrl(fileName);
    }

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
            return userRepository.findAllActive();
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
                    User newUser = new User();
                    newUser.setId(request.keycloakId());
                    newUser.setEmail(request.email());
                    newUser.setName(request.name());
                    newUser.setRole(role);
                    newUser.setActive(true);
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
