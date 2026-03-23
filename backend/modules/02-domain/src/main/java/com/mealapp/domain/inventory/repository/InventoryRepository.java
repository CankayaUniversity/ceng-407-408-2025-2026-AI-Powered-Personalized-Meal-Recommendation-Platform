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
    List<Inventory> findByUserId(String userId);

    /**
     * Kullanıcının elindeki belirli bir malzemeyi bulur.
     */
    List<Inventory> findByUserIdAndIngredientNameContainingIgnoreCase(String userId, String ingredientName);

    /**
     * Kullanıcının elindeki belirli bir malzeme ID'sine göre envanter kaydını bulur.
     */
    java.util.Optional<Inventory> findByUserIdAndIngredientId(String userId, Long ingredientId);
}
