package com.mealapp.domain.common.exception;

/**
 * Envanterde yeterli stok bulunmadığında fırlatılan hata sınıfı.
 */
public class InsufficientStockException extends MealAppDomainException {
    public InsufficientStockException(String message) {
        super(message);
    }
}
