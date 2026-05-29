package com.mealapp.domain.common.exception;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;

class MealAppDomainExceptionTest {
    @Test
    void shouldStoreMessage() {
        MealAppDomainException exception = new MealAppDomainException("Domain rule violated");

        assertEquals("Domain rule violated", exception.getMessage());
    }

    @Test
    void shouldBeRuntimeException() {
        MealAppDomainException exception = new MealAppDomainException("Domain rule violated");

        assertInstanceOf(RuntimeException.class, exception);
    }
}
