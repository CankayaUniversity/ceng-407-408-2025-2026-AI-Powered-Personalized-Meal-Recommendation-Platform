package com.mealapp.domain.consumption.service;

import com.mealapp.domain.consumption.entity.DailyConsumption;
import com.mealapp.domain.inventory.entity.Inventory;
import com.mealapp.domain.inventory.repository.InventoryRepository;
import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Ortak tüketim senaryolarını yöneten servis.
 */
@Service
@RequiredArgsConstructor
public class ConsumptionService {

    private final InventoryRepository inventoryRepository;
    private final DailyConsumptionService dailyConsumptionService;
    private final UserRepository userRepository;

    /**
     * Belirli bir envanter öğesini tüketir ve besin değerlerini paylaştırır.
     *
     * @param itemId      Tüketilecek envanter öğesi ID'si
     * @param userAmounts Her kullanıcı için tüketilen miktar (UserId -> Miktar)
     */
    @Transactional
    public void consume(Long itemId, java.util.Map<String, Double> userAmounts) {
        Inventory inventory = inventoryRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Envanter öğesi bulunamadı: " + itemId));

        double totalAmount = userAmounts.values().stream().mapToDouble(Double::doubleValue).sum();

        if (inventory.getQuantity() < totalAmount) {
            // Miktar 0'a düşebilir ancak yetersiz stok hatası verilmeli mi? 
            // Issue description'a göre kullanıcı 0 malzeme girebilmeli.
            // Ama tüketim yaparken stok yetersizse uyarı vermeli.
            // Mevcut mantığı koruyorum ancak silme işlemini yapmıyorum.
            throw new RuntimeException("Yetersiz stok!");
        }

        // 1. Stoktan düş (Miktar 0 olsa bile silme)
        inventory.setQuantity(Math.max(0, inventory.getQuantity() - totalAmount));
        inventoryRepository.save(inventory);

        // 2. Besin değerlerini her kullanıcıya kendi miktarına göre ekle
        Ingredient ingredient = inventory.getIngredient();

        for (java.util.Map.Entry<String, Double> entry : userAmounts.entrySet()) {
            String userId = entry.getKey();
            Double userAmount = entry.getValue();

            if (userAmount == null || userAmount <= 0) continue;

            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı: " + userId));

            DailyConsumption consumption = DailyConsumption.builder()
                    .user(user)
                    .foodName(ingredient.getName())
                    .ingredient(ingredient)
                    .portionGrams(userAmount)
                    .inventoryGroup(inventory.getInventoryGroup())
                    .isFromInventory(true)
                    .isCustomEntry(false)
                    .build();

            dailyConsumptionService.logConsumption(consumption, false);
        }
    }
}
