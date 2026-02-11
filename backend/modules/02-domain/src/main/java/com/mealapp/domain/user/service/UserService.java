package com.mealapp.domain.user.service;

import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Kullanıcı iş mantığını yöneten servis.
 * Profil oluşturma, tercih güncellenme ve kullanıcı sorgulama işlemlerini yapar.
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    /**
     * Yeni bir kullanıcı kaydeder veya mevcut kullanıcıyı günceller.
     */
    public User save(User user) {
        return userRepository.save(user);
    }

    /**
     * ID'ye göre kullanıcı detaylarını getirir.
     */
    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    /**
     * Kullanıcının diyet tercihlerini veya alerjilerini günceller.
     */
    public User updatePreferences(Long id, User.DietType dietType, java.util.List<String> allergies) {
        // TODO: İş mantığı (Kullanıcı var mı kontrolü vb.) eklenecek.
        return null;
    }
}
