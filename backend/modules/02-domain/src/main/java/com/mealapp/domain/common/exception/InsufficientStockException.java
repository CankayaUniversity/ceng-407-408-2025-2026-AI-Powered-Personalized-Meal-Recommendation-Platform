package com.mealapp.domain.common.exception;

/**
 * Envanterde yeterli stok bulunmadığında fırlatılan hata sınıfı.
 */
public class InsufficientStockException extends MealAppDomainException {
    public InsufficientStockException(String message) {
        super(message);
    }

    public InsufficientStockException(String messageCode, Object... messageArgs) {
        super(messageCode, messageArgs);
    }

    public static InsufficientStockException withCode(String messageCode) {
        return new InsufficientStockException(messageCode, new Object[0]);
    }

    public static InsufficientStockException withCode(String messageCode, Object... messageArgs) {
        return new InsufficientStockException(messageCode, messageArgs);
    }
}
