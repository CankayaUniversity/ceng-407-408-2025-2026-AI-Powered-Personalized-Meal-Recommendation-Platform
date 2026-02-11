package com.mealapp.domain.consumption.service;

import com.mealapp.domain.consumption.entity.DailyConsumption;
import com.mealapp.domain.consumption.repository.DailyConsumptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

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

    /**
     * Yeni bir tüketim kaydı oluşturur (tahmini kalori değeri dış katmanlarda hesaplanmış olmalıdır).
     */
    public DailyConsumption logConsumption(DailyConsumption consumption) {
        return dailyConsumptionRepository.save(consumption);
    }

    /**
     * Kullanıcının belirli bir gündeki toplam tahmini kalori tüketimini döner.
     */
    public int getTotalCaloriesForDate(Long userId, LocalDate date) {
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.atTime(LocalTime.MAX);
        List<DailyConsumption> items = dailyConsumptionRepository.findByUserIdAndConsumedAtBetween(userId, start, end);
        return items.stream()
                .map(DailyConsumption::getEstimatedCalories)
                .filter(c -> c != null)
                .mapToInt(Integer::intValue)
                .sum();
    }

    /**
     * Kullanıcının son X gün içindeki ortalama kalori tüketimini hesaplar.
     * Bu, devamlılık analizi ve akıllı öneriler için kullanılır.
     */
    public double getAverageCaloriesForLastDays(Long userId, int days) {
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
