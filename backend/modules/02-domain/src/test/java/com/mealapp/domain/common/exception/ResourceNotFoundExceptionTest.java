package com.mealapp.domain.common.exception;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;

class ResourceNotFoundExceptionTest {
    @Test
    void shouldStoreMessage() {
        ResourceNotFoundException exception = new ResourceNotFoundException("Recipe not found");

        assertEquals("Recipe not found", exception.getMessage());
    }

    @Test
    void shouldBeDomainException() {
        ResourceNotFoundException exception = new ResourceNotFoundException("Recipe not found");

        assertInstanceOf(MealAppDomainException.class, exception);
    }
}
