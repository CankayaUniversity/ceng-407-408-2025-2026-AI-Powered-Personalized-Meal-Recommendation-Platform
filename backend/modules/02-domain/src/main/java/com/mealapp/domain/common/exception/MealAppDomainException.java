package com.mealapp.domain.common.exception;

/**
 * Domain katmanındaki tüm özel hataların üst sınıfı.
 * İş kuralları ihlallerinde fırlatılır.
 */
public class MealAppDomainException extends RuntimeException {
    public MealAppDomainException(String message) {
        super(message);
    }
}
