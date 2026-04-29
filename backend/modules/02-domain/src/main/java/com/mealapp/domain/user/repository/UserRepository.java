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
     * E-posta adresine göre aktif kullanıcı bulur.
     */
    Optional<User> findByEmailAndActiveTrue(String email);

    /**
     * E-posta adresine göre kullanıcı bulur (Soft delete dahil).
     */
    Optional<User> findByEmail(String email);

    /**
     * ID'ye göre aktif kullanıcı bulur.
     */
    Optional<User> findByIdAndActiveTrue(String id);

    /**
     * İsim veya e-postaya göre aktif kullanıcıları arar (Davet sistemi için).
     */
    @Query("SELECT u FROM User u WHERE u.active = true AND (LOWER(u.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%')))")
    java.util.List<User> searchByQuery(@Param("query") String query);

    @Modifying
    @Query("UPDATE User u SET u.active = false WHERE u.id = :id")
    void softDelete(@Param("id") String id);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "UPDATE users SET id = :newId, updated_at = NOW() WHERE id = :oldId", nativeQuery = true)
    int relinkUserId(@Param("oldId") String oldId, @Param("newId") String newId);
}
