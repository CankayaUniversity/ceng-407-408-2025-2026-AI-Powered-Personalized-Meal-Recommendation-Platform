package com.mealapp.domain.consumption.repository;

import com.mealapp.domain.consumption.entity.DailyConsumption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Günlük tüketim kayıtlarına erişim sağlayan repository arayüzü.
 * Basit sorgularla kullanıcı bazlı günlük toplamları çekmek için kullanılır.
 */
@Repository
public interface DailyConsumptionRepository extends JpaRepository<DailyConsumption, Long> {

    /**
     * Belirli bir kullanıcıya ait, verilen tarih aralığındaki tüketimleri getirir.
     */
    List<DailyConsumption> findByUserIdAndConsumedAtBetween(Long userId, LocalDateTime start, LocalDateTime end);
}
