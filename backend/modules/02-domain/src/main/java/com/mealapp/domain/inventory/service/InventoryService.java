package com.mealapp.domain.inventory.service;

import com.mealapp.domain.inventory.entity.Inventory;
import com.mealapp.domain.inventory.repository.InventoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Kullanıcı envanteri (mutfak stoğu) ile ilgili iş mantığını yönetir.
 * Malzeme listeleme, stok güncelleme gibi işlemleri yapar.
 */
@Service
@RequiredArgsConstructor
public class InventoryService {

    private final InventoryRepository inventoryRepository;

    /**
     * Kullanıcının güncel envanterini getirir.
     */
    public List<Inventory> getUserInventory(Long userId) {
        return inventoryRepository.findByUserId(userId);
    }

    /**
     * Envantere yeni malzemeler ekler veya mevcutları günceller.
     */
    public void updateInventory(Long userId, List<Inventory> newItems) {
        // TODO: Mevcut stokları kontrol edip güncelleme veya ekleme mantığı.
    }
}
