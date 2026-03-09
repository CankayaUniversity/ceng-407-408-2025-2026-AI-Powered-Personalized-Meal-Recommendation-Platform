package com.mealapp.app.controller;

import com.mealapp.app.model.dto.user.UserDto;
import com.mealapp.app.model.mapper.user.UserMapper;
import com.mealapp.domain.common.exception.ResourceNotFoundException;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.user.service.UserService;
import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;
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
        // ID ile veritabanında arama yapalım
        User existing = userService.findById(request.getId()).orElse(null);
        
        User toSave;
        if (existing != null) {
            // Mevcut kullanıcıyı güncelle (Partial Update)
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
            
            toSave = existing;
        } else {
            // E-posta ile mükerrer kontrolü yapalım (409 Conflict'i önlemek için)
            User emailUser = userService.findByEmail(request.getEmail()).orElse(null);
            if (emailUser != null) {
                // E-posta ile bulundu ama ID farklıysa, bu durumda ID'yi güncelleyemeyiz (PK olduğu için)
                // Mevcut kaydı döndürelim veya güncellemeye çalışalım.
                // En güvenlisi mevcut e-posta kaydına yeni Keycloak ID'sini atamak (Eski ID String ise silip yeni açmak gerekebilir)
                // Şimdilik sadece bu kaydı güncelleyip döndürelim.
                if (request.getName() != null) emailUser.setName(request.getName());
                toSave = emailUser;
            } else {
                // Tamamen yeni kullanıcı
                toSave = userMapper.toEntity(request);
            }
        }
        
        User saved = userService.save(toSave);
        return userMapper.toDto(saved);
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
