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
    
    /**
     * Belirli bir kullanıcıya ait tüm malzemeleri listeler.
     */
    List<Inventory> findByUserIdOrderByInventoryGroupIdAscIngredientNameAsc(String userId);

    List<Inventory> findByInventoryGroupIdAndUserIdOrderByIngredientNameAsc(Long inventoryGroupId, String userId);

    /**
     * Kullanıcının elindeki belirli bir malzemeyi bulur.
     */
    List<Inventory> findByUserIdAndIngredientNameContainingIgnoreCaseOrderByInventoryGroupIdAsc(String userId, String ingredientName);

    /**
     * Kullanıcının elindeki belirli bir malzeme ID'sine göre envanter kaydını bulur.
     */
    java.util.Optional<Inventory> findByUserIdAndIngredientId(String userId, Long ingredientId);

    java.util.Optional<Inventory> findByUserIdAndInventoryGroupIdAndIngredientId(String userId, Long inventoryGroupId, Long ingredientId);

    java.util.Optional<Inventory> findByIdAndUserIdAndInventoryGroupId(Long id, String userId, Long inventoryGroupId);

    List<Inventory> findByUserIdAndIngredientIdOrderByInventoryGroupIdAsc(String userId, Long ingredientId);
}
