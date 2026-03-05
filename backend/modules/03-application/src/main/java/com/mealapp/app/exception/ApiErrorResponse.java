package com.mealapp.app.exception;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

/**
 * API katmanından dönen hata mesajlarının standart formatı.
 */
@Data
@Builder
@AllArgsConstructor
public class ApiErrorResponse {
    private String message;
    private Integer status;
    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();
    private String path;
    private List<ValidationError> validationErrors;

    @Data
    @AllArgsConstructor
    public static class ValidationError {
        private String field;
        private String message;
    }
}
