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
     * @param totalAmount Toplam tüketilen miktar
     * @param userIds     Tüketime dahil olan kullanıcıların ID listesi
     */
    @Transactional
    public void consume(Long itemId, Double totalAmount, List<String> userIds) {
        Inventory inventory = inventoryRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Envanter öğesi bulunamadı: " + itemId));

        if (inventory.getQuantity() < totalAmount) {
            throw new RuntimeException("Yetersiz stok!");
        }

        // 1. Stoktan düş
        inventory.setQuantity(inventory.getQuantity() - totalAmount);
        inventoryRepository.save(inventory);

        // 2. Besin değerlerini her kullanıcıya paylaştırarak ekle
        double amountPerUser = totalAmount / userIds.size();
        Ingredient ingredient = inventory.getIngredient();

        for (String userId : userIds) {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı: " + userId));

            DailyConsumption consumption = DailyConsumption.builder()
                    .user(user)
                    .foodName(ingredient.getName())
                    .ingredient(ingredient)
                    .portionGrams(amountPerUser) // Varsayılan gram/birim dönüşümü burada basitleştirildi
                    .inventoryGroup(inventory.getInventoryGroup())
                    .isFromInventory(true)
                    .isCustomEntry(false)
                    .build();

            // DailyConsumptionService içindeki enrichConsumption ve logConsumption mantığını kullanıyoruz
            dailyConsumptionService.logConsumption(consumption);
        }
    }
}
