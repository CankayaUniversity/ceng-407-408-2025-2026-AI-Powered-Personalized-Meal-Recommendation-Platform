package com.mealapp.app.exception;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * API katmanından dönen hata mesajlarının standart formatı.
 */
@Data
@Builder
public class ApiErrorResponse {
    private String message;
    private Integer status;
    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();
    private String path;
}
