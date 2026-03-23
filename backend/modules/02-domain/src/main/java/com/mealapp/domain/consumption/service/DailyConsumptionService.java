package com.mealapp.domain.consumption.service;

import com.mealapp.domain.consumption.entity.DailyConsumption;
import com.mealapp.domain.consumption.repository.DailyConsumptionRepository;
import com.mealapp.domain.inventory.service.InventoryService;
import com.mealapp.domain.recipe.entity.RecipeIngredient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * Günlük tüketim kayıtlarını yöneten domain servisi.
 * Not: Kalori tahmini (AI) ve metin->kalori dönüşümü Application/Infrastructure katmanında yapılmalı,
 * bu servis sadece iş kuralı odağında kayıt ve toplama işlemlerini yapmalıdır.
 */
@Service
@RequiredArgsConstructor
public class DailyConsumptionService {

    private final DailyConsumptionRepository dailyConsumptionRepository;
    private final InventoryService inventoryService;

    /**
     * Yeni bir tüketim kaydı oluşturur. 
     * Eğer sistem dışı bir yemekse ve porsiyon bilgisi varsa, yaklaşık değerleri atar.
     * Eğer evden (inventory) tüketilmişse, stok düşümü yapar.
     */
    @Transactional
    public DailyConsumption logConsumption(DailyConsumption consumption) {
        if (Boolean.TRUE.equals(consumption.getIsCustomEntry()) && consumption.getPortionSize() != null) {
            applyApproximateNutrition(consumption);
        }
        
        DailyConsumption saved = dailyConsumptionRepository.save(consumption);
        
        // Stok düşüm mantığı: Sadece 'isFromInventory' true ise ve bir 'recipe' seçilmişse
        if (Boolean.TRUE.equals(saved.getIsFromInventory()) && saved.getRecipe() != null) {
            deductFromInventory(saved);
        }
        
        return saved;
    }

    private void deductFromInventory(DailyConsumption consumption) {
        if (consumption.getRecipe() == null || consumption.getRecipe().getRecipeIngredients() == null) {
            return;
        }

        String userId = consumption.getUser().getId();
        // Porsiyon çarpanı (Örn: Tarif 4 kişilikse ve kullanıcı 1 porsiyon yemişse 0.25 ile çarpılır)
        // Şimdilik basitlik için 1 porsiyon üzerinden düşüyoruz. 
        // İleride 'servingsConsumed' alanı eklenebilir.
        
        for (RecipeIngredient ri : consumption.getRecipe().getRecipeIngredients()) {
            if (ri.getIngredient() != null) {
                inventoryService.consumeFromInventory(userId, ri.getIngredient().getId(), ri.getGrams());
            }
        }
    }

    private void applyApproximateNutrition(DailyConsumption consumption) {
        // Profesyonel hesaplama yerine 'yaklaşık' standart değerler (Örn: Bir öğün ortalama değerleri)
        double multiplier = switch (consumption.getPortionSize()) {
            case SMALL -> 0.7;
            case MEDIUM -> 1.0;
            case LARGE -> 1.3;
        };

        // Ortalama bir ev yemeği öğünü (yaklaşık 500 kcal baz alınarak)
        if (consumption.getEstimatedCalories() == null) {
            consumption.setEstimatedCalories((int) (500 * multiplier));
        }
        if (consumption.getEstimatedProtein() == null) {
            consumption.setEstimatedProtein(20.0 * multiplier);
        }
        if (consumption.getEstimatedCarbs() == null) {
            consumption.setEstimatedCarbs(50.0 * multiplier);
        }
        if (consumption.getEstimatedFat() == null) {
            consumption.setEstimatedFat(15.0 * multiplier);
        }
    }

    /**
     * Kullanıcının belirli bir tarihteki toplam tüketilen kalori ve makrolarını hesaplar.
     */
    public DailyNutritionSummary getDailyNutritionSummary(String userId, LocalDate date) {
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.atTime(LocalTime.MAX);
        List<DailyConsumption> logs = dailyConsumptionRepository.findByUserIdAndConsumedAtBetween(userId, start, end);

        int totalCalories = logs.stream()
                .map(DailyConsumption::getEstimatedCalories)
                .filter(c -> c != null)
                .mapToInt(Integer::intValue)
                .sum();

        double totalProtein = logs.stream()
                .map(DailyConsumption::getEstimatedProtein)
                .filter(p -> p != null)
                .mapToDouble(Double::doubleValue)
                .sum();

        double totalCarbs = logs.stream()
                .map(DailyConsumption::getEstimatedCarbs)
                .filter(c -> c != null)
                .mapToDouble(Double::doubleValue)
                .sum();

        double totalFat = logs.stream()
                .map(DailyConsumption::getEstimatedFat)
                .filter(f -> f != null)
                .mapToDouble(Double::doubleValue)
                .sum();

        return new DailyNutritionSummary(totalCalories, totalProtein, totalCarbs, totalFat);
    }

    public record DailyNutritionSummary(
            int totalCalories,
            double totalProtein,
            double totalCarbs,
            double totalFat
    ) {}

    /**
     * Kullanıcının son X gün içindeki ortalama kalori tüketimini hesaplar.
     * Bu, devamlılık analizi ve akıllı öneriler için kullanılır.
     */
    public double getAverageCaloriesForLastDays(String userId, int days) {
        LocalDateTime start = LocalDateTime.now().minusDays(days);
        LocalDateTime end = LocalDateTime.now();
        List<DailyConsumption> items = dailyConsumptionRepository.findByUserIdAndConsumedAtBetween(userId, start, end);
        
        if (items.isEmpty()) return 0;
        
        return items.stream()
                .map(DailyConsumption::getEstimatedCalories)
                .filter(c -> c != null)
                .mapToInt(Integer::intValue)
                .average()
                .orElse(0);
    }
}
