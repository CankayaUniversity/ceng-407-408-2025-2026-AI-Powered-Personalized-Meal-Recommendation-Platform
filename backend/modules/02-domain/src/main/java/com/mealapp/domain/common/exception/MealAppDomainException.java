package com.mealapp.domain.common.exception;

/**
 * Domain katmanındaki tüm özel hataların üst sınıfı.
 * İş kuralları ihlallerinde fırlatılır.
 */
public class MealAppDomainException extends RuntimeException {
    private final String messageCode;
    private final Object[] messageArgs;

    public MealAppDomainException(String message) {
        super(message);
        this.messageCode = null;
        this.messageArgs = new Object[0];
    }

    public MealAppDomainException(String messageCode, Object... messageArgs) {
        super(messageCode);
        this.messageCode = messageCode;
        this.messageArgs = messageArgs == null ? new Object[0] : messageArgs;
    }

    public static MealAppDomainException withCode(String messageCode) {
        return new MealAppDomainException(messageCode, new Object[0]);
    }

    public static MealAppDomainException withCode(String messageCode, Object... messageArgs) {
        return new MealAppDomainException(messageCode, messageArgs);
    }

    public String getMessageCode() {
        return messageCode;
    }

    public Object[] getMessageArgs() {
        return messageArgs.clone();
    }
}
