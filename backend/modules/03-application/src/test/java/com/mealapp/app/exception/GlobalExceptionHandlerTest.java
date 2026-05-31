package com.mealapp.app.exception;

import com.mealapp.app.util.MessageUtil;
import com.mealapp.domain.common.exception.InsufficientStockException;
import com.mealapp.domain.common.exception.MealAppDomainException;
import com.mealapp.domain.common.exception.ResourceNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.mock.http.MockHttpInputMessage;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GlobalExceptionHandlerTest {

    private static final String REQUEST_PATH = "/api/v1/test";

    @Mock
    private MessageUtil messageUtil;

    @Mock
    private HttpServletRequest request;

    @InjectMocks
    private GlobalExceptionHandler handler;

    @Test
    void handleResourceNotFoundShouldReturnNotFound() {
        when(request.getRequestURI()).thenReturn(REQUEST_PATH);

        ResponseEntity<ApiErrorResponse> response =
                handler.handleResourceNotFound(new ResourceNotFoundException("Recipe not found"), request);

        assertError(response, HttpStatus.NOT_FOUND, "Recipe not found");
    }

    @Test
    void handleDomainExceptionShouldReturnBadRequest() {
        when(request.getRequestURI()).thenReturn(REQUEST_PATH);

        ResponseEntity<ApiErrorResponse> response =
                handler.handleDomainException(new MealAppDomainException("Domain rule violated"), request);

        assertError(response, HttpStatus.BAD_REQUEST, "Domain rule violated");
    }

    @Test
    void handleInsufficientStockExceptionShouldReturnBadRequest() {
        when(request.getRequestURI()).thenReturn(REQUEST_PATH);

        ResponseEntity<ApiErrorResponse> response =
                handler.handleInsufficientStockException(new InsufficientStockException("Not enough rice"), request);

        assertError(response, HttpStatus.BAD_REQUEST, "Not enough rice");
    }

    @Test
    void handleDataIntegrityViolationShouldReturnConflictMessage() {
        when(request.getRequestURI()).thenReturn(REQUEST_PATH);
        when(messageUtil.getMessage("error.conflict")).thenReturn("Conflict");

        ResponseEntity<ApiErrorResponse> response =
                handler.handleDataIntegrityViolation(new DataIntegrityViolationException("duplicate"), request);

        assertError(response, HttpStatus.CONFLICT, "Conflict");
    }

    @Test
    void handleIllegalArgumentShouldReturnBadRequest() {
        when(request.getRequestURI()).thenReturn(REQUEST_PATH);

        ResponseEntity<ApiErrorResponse> response =
                handler.handleIllegalArgument(new IllegalArgumentException("Invalid portion"), request);

        assertError(response, HttpStatus.BAD_REQUEST, "Invalid portion");
    }

    @Test
    void handleHttpMessageNotReadableShouldReturnBadRequest() {
        when(request.getRequestURI()).thenReturn(REQUEST_PATH);
        when(messageUtil.getMessage("error.unreadable_request")).thenReturn("Unreadable request");

        ResponseEntity<ApiErrorResponse> response =
                handler.handleHttpMessageNotReadable(
                        new HttpMessageNotReadableException("bad json", new MockHttpInputMessage(new byte[0])),
                        request
                );

        ApiErrorResponse body = assertStatusAndPath(response, HttpStatus.BAD_REQUEST);
        assertEquals("Unreadable request", body.getMessage());
    }

    @Test
    void handleGeneralExceptionShouldReturnInternalServerErrorMessage() {
        when(request.getRequestURI()).thenReturn(REQUEST_PATH);
        when(messageUtil.getMessage("error.internal_server_error")).thenReturn("Internal server error");

        ResponseEntity<ApiErrorResponse> response =
                handler.handleGeneralException(new RuntimeException("boom"), request);

        assertError(response, HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error");
    }

    private static ApiErrorResponse assertStatusAndPath(
            ResponseEntity<ApiErrorResponse> response,
            HttpStatus expectedStatus
    ) {
        ApiErrorResponse body = response.getBody();

        assertEquals(expectedStatus, response.getStatusCode());
        assertNotNull(body);
        assertEquals(expectedStatus.value(), body.getStatus());
        assertEquals(REQUEST_PATH, body.getPath());
        assertNotNull(body.getTimestamp());
        return body;
    }

    private static void assertError(
            ResponseEntity<ApiErrorResponse> response,
            HttpStatus expectedStatus,
            String expectedMessage
    ) {
        ApiErrorResponse body = assertStatusAndPath(response, expectedStatus);

        assertEquals(expectedMessage, body.getMessage());
    }
}
