package com.mealapp.domain.consumption.service;

import com.mealapp.domain.common.exception.MealAppDomainException;
import com.mealapp.domain.common.exception.ResourceNotFoundException;
import com.mealapp.domain.consumption.entity.DailyConsumption;
import com.mealapp.domain.inventory.entity.Inventory;
import com.mealapp.domain.inventory.repository.InventoryRepository;
import com.mealapp.domain.recipe.entity.Ingredient;
import com.mealapp.domain.user.entity.User;
import com.mealapp.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Objects;

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
        if (userAmounts == null || userAmounts.isEmpty()) {
            throw MealAppDomainException.withCode("domain.consumption.members_required");
        }

        Inventory inventory = inventoryRepository.findById(itemId)
                .orElseThrow(() -> ResourceNotFoundException.withCode("domain.inventory.item.not_found", itemId));

        for (Map.Entry<String, Double> entry : userAmounts.entrySet()) {
            Double amount = entry.getValue();
            if (amount == null || !Double.isFinite(amount) || amount <= 0) {
                throw MealAppDomainException.withCode("domain.consumption.member_amount_positive");
            }
        }

        double totalAmount = userAmounts.values().stream()
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .sum();

        if (inventory.getQuantity() < totalAmount) {
            throw MealAppDomainException.withCode("domain.inventory.stock_insufficient.simple");
        }

        // 1. Stoktan düş (Miktar 0 olsa bile silme)
        inventory.setQuantity(Math.max(0, inventory.getQuantity() - totalAmount));
        inventoryRepository.save(inventory);

        // 2. Besin değerlerini her kullanıcıya kendi miktarına göre ekle
        Ingredient ingredient = inventory.getIngredient();

        for (java.util.Map.Entry<String, Double> entry : userAmounts.entrySet()) {
            String userId = entry.getKey();
            Double userAmount = entry.getValue();

            User user = userRepository.findById(userId)
                    .orElseThrow(() -> MealAppDomainException.withCode("domain.user.not_found", userId));

            double portionGrams = userAmount;
            if (ingredient != null
                    && ingredient.getPhysicalState() == Ingredient.PhysicalState.LIQUID
                    && ingredient.getDensity() != null
                    && ingredient.getDensity() > 0) {
                portionGrams = userAmount * ingredient.getDensity();
            }

            DailyConsumption consumption = DailyConsumption.builder()
                    .user(user)
                    .foodName(ingredient.getName())
                    .ingredient(ingredient)
                    .portionGrams(portionGrams)
                    .inventoryGroup(inventory.getInventoryGroup())
                    .isFromInventory(true)
                    .isCustomEntry(false)
                    .build();

            dailyConsumptionService.logConsumption(consumption, false);
        }
    }
}
