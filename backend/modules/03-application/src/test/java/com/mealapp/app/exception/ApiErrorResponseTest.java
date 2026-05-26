package com.mealapp.app.exception;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class ApiErrorResponseTest {
    @Test
    void builderShouldPopulateFieldsAndDefaultTimestamp() {
        ApiErrorResponse.ValidationError validationError =
                new ApiErrorResponse.ValidationError("email", "must be valid");

        ApiErrorResponse response = ApiErrorResponse.builder()
                .message("Bad request")
                .status(400)
                .path("/api/v1/users")
                .validationErrors(List.of(validationError))
                .build();

        assertEquals("Bad request", response.getMessage());
        assertEquals(400, response.getStatus());
        assertEquals("/api/v1/users", response.getPath());
        assertEquals(List.of(validationError), response.getValidationErrors());
        assertNotNull(response.getTimestamp());
    }

    @Test
    void builderShouldAllowExplicitTimestamp() {
        LocalDateTime timestamp = LocalDateTime.of(2026, 5, 26, 10, 30);

        ApiErrorResponse response = ApiErrorResponse.builder()
                .message("Not found")
                .status(404)
                .timestamp(timestamp)
                .path("/api/v1/recipes/1")
                .build();

        assertEquals(timestamp, response.getTimestamp());
    }

    @Test
    void validationErrorShouldStoreFieldAndMessage() {
        ApiErrorResponse.ValidationError validationError =
                new ApiErrorResponse.ValidationError("name", "must not be blank");

        assertEquals("name", validationError.getField());
        assertEquals("must not be blank", validationError.getMessage());
    }
}
