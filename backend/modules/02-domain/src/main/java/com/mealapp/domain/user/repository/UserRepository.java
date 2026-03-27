package com.mealapp.domain.user.repository;

import com.mealapp.domain.user.entity.User;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

import org.springframework.data.repository.query.Param;

/**
 * Kullanıcı verilerine erişim sağlayan standart repository arayüzü.
 * Spring Data JPA sayesinde temel CRUD işlemleri otomatik olarak sağlanır.
 */
@Repository
public interface UserRepository extends JpaRepository<User, String> {
    
    /**
     * E-posta adresine göre kullanıcı bulur.
     */
    Optional<User> findByEmail(String email);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "UPDATE users SET id = :newId, updated_at = NOW() WHERE id = :oldId", nativeQuery = true)
    int relinkUserId(@Param("oldId") String oldId, @Param("newId") String newId);
}
