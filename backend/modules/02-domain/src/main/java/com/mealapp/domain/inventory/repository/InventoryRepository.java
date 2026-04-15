package com.mealapp.domain.inventory.repository;

import com.mealapp.domain.inventory.entity.Inventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

/**
 * Envanter verilerine erişim sağlayan repository arayüzü.
 */
@Repository
public interface InventoryRepository extends JpaRepository<Inventory, Long> {
    
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"ingredient", "inventoryGroup"})
    List<Inventory> findByInventoryGroupUsersIdAndInventoryGroupIdInOrderByInventoryGroupIdAscIngredientNameAsc(String userId, List<Long> groupIds);

    List<Inventory> findByInventoryGroupIdAndInventoryGroupUsersIdOrderByIngredientNameAsc(Long inventoryGroupId, String userId);

    org.springframework.data.domain.Page<Inventory> findByInventoryGroupIdAndInventoryGroupUsersIdOrderByIngredientNameAsc(Long inventoryGroupId, String userId, org.springframework.data.domain.Pageable pageable);

    /**
     * Kullanıcının üye olduğu lokasyonlardaki belirli bir malzemeyi bulur.
     */
    List<Inventory> findByInventoryGroupUsersIdAndIngredientNameContainingIgnoreCaseOrderByInventoryGroupIdAsc(String userId, String ingredientName);

    /**
     * Kullanıcının üye olduğu lokasyonlardaki belirli bir malzeme ID'sine göre envanter kayıtlarını bulur.
     */
    List<Inventory> findByInventoryGroupUsersIdAndIngredientId(String userId, Long ingredientId);

    java.util.Optional<Inventory> findByInventoryGroupUsersIdAndInventoryGroupIdAndIngredientId(String userId, Long inventoryGroupId, Long ingredientId);

    java.util.Optional<Inventory> findByIdAndInventoryGroupUsersIdAndInventoryGroupId(Long id, String userId, Long inventoryGroupId);

    List<Inventory> findByInventoryGroupUsersIdAndIngredientIdOrderByInventoryGroupIdAsc(String userId, Long ingredientId);
}
