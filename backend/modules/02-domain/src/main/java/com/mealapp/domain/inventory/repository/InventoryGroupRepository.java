package com.mealapp.domain.inventory.repository;

import com.mealapp.domain.inventory.entity.InventoryGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Kullanıcının lokasyon bazlı envanter gruplarına erişim sağlar.
 */
@Repository
public interface InventoryGroupRepository extends JpaRepository<InventoryGroup, Long> {

    List<InventoryGroup> findByUserIdOrderByIdAsc(String userId);

    Optional<InventoryGroup> findByIdAndUserId(Long id, String userId);

    Optional<InventoryGroup> findFirstByUserIdOrderByIdAsc(String userId);

    boolean existsByUserId(String userId);

    boolean existsByUserIdAndNameIgnoreCase(String userId, String name);

    boolean existsByUserIdAndNameIgnoreCaseAndIdNot(String userId, String name, Long id);

    long countByUserId(String userId);
}
