package com.mealapp.domain.inventory.service;

import com.mealapp.domain.inventory.entity.Inventory;
import com.mealapp.domain.inventory.repository.InventoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import org.springframework.transaction.annotation.Transactional;
import java.util.List;

/**
 * Kullanıcı envanteri (mutfak stoğu) ile ilgili iş mantığını yönetir.
 * Malzeme listeleme, stok güncelleme gibi işlemleri yapar.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class InventoryService {

    private final InventoryRepository inventoryRepository;

    /**
     * Kullanıcının güncel envanterini getirir.
     */
    public List<Inventory> getUserInventory(String userId) {
        return inventoryRepository.findByUserId(userId);
    }

    /**
     * Envantere yeni malzemeler ekler veya mevcutları günceller (Upsert).
     */
    public void updateInventory(String userId, List<Inventory> newItems) {
        for (Inventory item : newItems) {
            if (item.getIngredient() == null) continue;
            
            inventoryRepository.findByUserIdAndIngredientId(userId, item.getIngredient().getId())
                .ifPresentOrElse(
                    existing -> {
                        existing.setQuantity(item.getQuantity());
                        existing.setUnit(item.getUnit());
                        inventoryRepository.save(existing);
                    },
                    () -> {
                        item.setId(null); // Yeni kayıt
                        inventoryRepository.save(item);
                    }
                );
        }
    }

    /**
     * Verilen malzemeleri kullanıcının envanterinden düşer.
     * Miktar eksiye düşerse, envanterden tamamen kaldırılabilir veya sıfıra çekilebilir.
     */
    @Transactional
    public void consumeFromInventory(String userId, Long ingredientId, Double quantityToDeduct) {
        inventoryRepository.findByUserIdAndIngredientId(userId, ingredientId)
            .ifPresent(existing -> {
                double newQuantity = existing.getQuantity() - quantityToDeduct;
                if (newQuantity <= 0) {
                    inventoryRepository.delete(existing);
                } else {
                    existing.setQuantity(newQuantity);
                    inventoryRepository.save(existing);
                }
            });
    }
}
