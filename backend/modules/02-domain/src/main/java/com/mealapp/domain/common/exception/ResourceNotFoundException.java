package com.mealapp.domain.common.exception;

/**
 * Sistemde aranan bir kaynak (Kullanıcı, Tarif vb.) bulunamadığında fırlatılır.
 */
public class ResourceNotFoundException extends MealAppDomainException {
    public ResourceNotFoundException(String message) {
        super(message);
    }

    public ResourceNotFoundException(String messageCode, Object... messageArgs) {
        super(messageCode, messageArgs);
    }

    public static ResourceNotFoundException withCode(String messageCode) {
        return new ResourceNotFoundException(messageCode, new Object[0]);
    }

    public static ResourceNotFoundException withCode(String messageCode, Object... messageArgs) {
        return new ResourceNotFoundException(messageCode, messageArgs);
    }
}
