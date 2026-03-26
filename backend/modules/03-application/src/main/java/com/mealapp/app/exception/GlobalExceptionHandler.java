package com.mealapp.app.exception;

import com.mealapp.app.util.MessageUtil;
import com.mealapp.domain.common.exception.MealAppDomainException;
import com.mealapp.domain.common.exception.ResourceNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.TransactionSystemException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.List;

/**
 * Uygulama genelindeki hataları yakalayıp kullanıcıya anlamlı JSON mesajları döner.
 */
@ControllerAdvice
@Slf4j
@RequiredArgsConstructor
public class GlobalExceptionHandler {

    private final MessageUtil messageUtil;

    /**
     * Kaynak bulunamadığında (404 Not Found) fırlatılan hata.
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleResourceNotFound(ResourceNotFoundException ex, HttpServletRequest request) {
        ApiErrorResponse error = ApiErrorResponse.builder()
                .message(ex.getMessage())
                .status(HttpStatus.NOT_FOUND.value())
                .path(request.getRequestURI())
                .build();
        return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
    }

    /**
     * Genel Domain iş kuralı ihlalleri (400 Bad Request).
     */
    @ExceptionHandler(MealAppDomainException.class)
    public ResponseEntity<ApiErrorResponse> handleDomainException(MealAppDomainException ex, HttpServletRequest request) {
        ApiErrorResponse error = ApiErrorResponse.builder()
                .message(ex.getMessage())
                .status(HttpStatus.BAD_REQUEST.value())
                .path(request.getRequestURI())
                .build();
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    /**
     * Bean Validation hataları (400 Bad Request).
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidationException(MethodArgumentNotValidException ex, HttpServletRequest request) {
        List<ApiErrorResponse.ValidationError> validationErrors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> new ApiErrorResponse.ValidationError(error.getField(), error.getDefaultMessage()))
                .toList();
        ApiErrorResponse error = ApiErrorResponse.builder()
                .message(messageUtil.getMessage("error.bad_request"))
                .status(HttpStatus.BAD_REQUEST.value())
                .path(request.getRequestURI())
                .validationErrors(validationErrors)
                .build();
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    /**
     * Veritabanı kısıt ihlalleri (Örn: Unique constraint ihlali) (409 Conflict).
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleDataIntegrityViolation(DataIntegrityViolationException ex, HttpServletRequest request) {
        log.error("Veri bütünlüğü hatası: ", ex);
        ApiErrorResponse error = ApiErrorResponse.builder()
                .message(messageUtil.getMessage("error.conflict"))
                .status(HttpStatus.CONFLICT.value())
                .path(request.getRequestURI())
                .build();
        return new ResponseEntity<>(error, HttpStatus.CONFLICT);
    }

    /**
     * JSR-380 Constraint ihlalleri (ör. @Email, @NotBlank) (400 Bad Request) — Method argument seviyesi dışında.
     */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleConstraintViolation(ConstraintViolationException ex, HttpServletRequest request) {
        ApiErrorResponse error = ApiErrorResponse.builder()
                .message("Validasyon hatası: Alan kısıtları ihlal edildi.")
                .status(HttpStatus.BAD_REQUEST.value())
                .path(request.getRequestURI())
                .build();
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    /**
     * Transaction seviyesinde sarılmış validasyon/kısıt ihlalleri için genel yakalayıcı.
     */
    @ExceptionHandler(TransactionSystemException.class)
    public ResponseEntity<ApiErrorResponse> handleTransactionSystem(TransactionSystemException ex, HttpServletRequest request) {
        Throwable root = ex.getMostSpecificCause();
        if (root instanceof ConstraintViolationException constraintViolationException) {
            return handleConstraintViolation(constraintViolationException, request);
        }
        ApiErrorResponse error = ApiErrorResponse.builder()
                .message("İşlem sırasında beklenmeyen bir hata oluştu.")
                .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .path(request.getRequestURI())
                .build();
        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    /**
     * Hatalı argümanlar için 400.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiErrorResponse> handleIllegalArgument(IllegalArgumentException ex, HttpServletRequest request) {
        ApiErrorResponse error = ApiErrorResponse.builder()
                .message(ex.getMessage() != null ? ex.getMessage() : "Geçersiz istek")
                .status(HttpStatus.BAD_REQUEST.value())
                .path(request.getRequestURI())
                .build();
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    /**
     * İstek gövdesi okunamadığında (ör. enum için geçersiz değer, boş string vb.) 400 döndür.
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiErrorResponse> handleHttpMessageNotReadable(HttpMessageNotReadableException ex, HttpServletRequest request) {
        ApiErrorResponse error = ApiErrorResponse.builder()
                .message("İstek gövdesi okunamadı veya alan tipleri geçersiz. Lütfen gönderdiğiniz verileri kontrol edin.")
                .status(HttpStatus.BAD_REQUEST.value())
                .path(request.getRequestURI())
                .build();
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    /**
     * Beklenmeyen sistem hataları (500 Internal Server Error).
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleGeneralException(Exception ex, HttpServletRequest request) {
        log.error("Beklenmeyen hata: ", ex);
        ApiErrorResponse error = ApiErrorResponse.builder()
                .message(messageUtil.getMessage("error.internal_server_error"))
                .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .path(request.getRequestURI())
                .build();
        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
