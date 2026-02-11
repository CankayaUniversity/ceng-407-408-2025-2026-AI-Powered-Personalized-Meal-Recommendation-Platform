package com.mealapp.domain.common.exception;

/**
 * Sistemde aranan bir kaynak (Kullanıcı, Tarif vb.) bulunamadığında fırlatılır.
 */
public class ResourceNotFoundException extends MealAppDomainException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
