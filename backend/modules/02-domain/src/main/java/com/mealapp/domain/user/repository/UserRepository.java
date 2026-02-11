package com.mealapp.domain.user.repository;

import com.mealapp.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

/**
 * Kullanıcı verilerine erişim sağlayan standart repository arayüzü.
 * Spring Data JPA sayesinde temel CRUD işlemleri otomatik olarak sağlanır.
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    /**
     * E-posta adresine göre kullanıcı bulur.
     */
    Optional<User> findByEmail(String email);
}
