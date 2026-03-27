package com.mealapp.domain.user.service;

import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
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
public class UserService {

    private final UserRepository userRepository;

    /**
     * Yeni bir kullanıcı kaydeder veya mevcut kullanıcıyı günceller.
     */
    public User save(User user) {
        return userRepository.save(user);
    }

    /**
     * E-posta adresine göre kullanıcı bulur.
     */
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    /**
     * ID'ye göre kullanıcı detaylarını getirir.
     */
    public Optional<User> findById(String id) {
        return userRepository.findById(id);
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
     * Kullanıcıyı siler ve değişiklikleri hemen yansıtır.
     */
    public void delete(User user) {
        userRepository.delete(user);
        userRepository.flush();
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
