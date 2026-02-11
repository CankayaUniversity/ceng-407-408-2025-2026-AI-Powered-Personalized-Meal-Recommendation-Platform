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
    List<Inventory> findByUserId(Long userId);

    /**
     * Kullanıcının elindeki belirli bir malzemeyi bulur.
     */
    List<Inventory> findByUserIdAndIngredientNameContainingIgnoreCase(Long userId, String ingredientName);
}
