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

    List<InventoryGroup> findByUsersIdOrderByIdAsc(String userId);

    org.springframework.data.domain.Page<InventoryGroup> findByUsersIdOrderByIdAsc(String userId, org.springframework.data.domain.Pageable pageable);

    Optional<InventoryGroup> findByIdAndUsersId(Long id, String userId);

    Optional<InventoryGroup> findFirstByUsersIdOrderByIdAsc(String userId);

    boolean existsByUsersId(String userId);

    boolean existsByUsersIdAndNameIgnoreCase(String userId, String name);

    boolean existsByUsersIdAndNameIgnoreCaseAndIdNot(String userId, String name, Long id);

    long countByUsersId(String userId);
}
