/*
    AccessDeniedException	403 Forbidden	UNAUTHORIZED
    MethodArgumentNotValidException, ConstraintViolationException, BindException	400 Bad Request	VALIDATION_FAILED
    HttpRequestMethodNotSupportedException	405 Method Not Allowed	METHOD_NOT_ALLOWED
    HttpMediaTypeNotSupportedException	415 Unsupported Media Type	UNSUPPORTED_MEDIA_TYPE
    HttpMessageNotReadableException	400 Bad Request	REQUEST_BODY_INVALID
    MissingServletRequestParameterException	400 Bad Request	REQUEST_PARAM_MISSING
    Exception (default fallback)	500	UNCATEGORIZED_EXCEPTION
*/


package com.connectJPA.LinguaVietnameseApp.exception;

import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AppException.class)
    public ResponseEntity<AppApiResponse> handleAppException(AppException exception) {
        ErrorCode errorCode = exception.getErrorCode();

        return ResponseEntity
                .status(errorCode.getStatusCode())
                .body(AppApiResponse.builder()
                        .code(errorCode.getCode())
                        .message(errorCode.getMessage())
                        .build());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<AppApiResponse> handleAccessDenied(AccessDeniedException e) {
        ErrorCode errorCode = ErrorCode.UNAUTHORIZED;

        return ResponseEntity
                .status(errorCode.getStatusCode())
                .body(AppApiResponse.builder()
                        .code(errorCode.getCode())
                        .message(errorCode.getMessage())
                        .build());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<AppApiResponse> handleMethodArgNotValid(MethodArgumentNotValidException exception) {
        String enumKey = exception.getFieldError() != null ? exception.getFieldError().getDefaultMessage() : null;
        ErrorCode errorCode = ErrorCode.VALIDATION_FAILED;

        try {
            if (enumKey != null) {
                errorCode = ErrorCode.valueOf(enumKey);
            }
        } catch (IllegalArgumentException ignore) {}

        return ResponseEntity
                .badRequest()
                .body(AppApiResponse.builder()
                        .code(errorCode.getCode())
                        .message(errorCode.getMessage())
                        .build());
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<AppApiResponse> handleMethodNotAllowed(HttpRequestMethodNotSupportedException e) {
        ErrorCode errorCode = ErrorCode.METHOD_NOT_ALLOWED;
        return ResponseEntity
                .status(errorCode.getStatusCode())
                .body(AppApiResponse.builder()
                        .code(errorCode.getCode())
                        .message(errorCode.getMessage())
                        .build());
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<AppApiResponse> handleUnsupportedMediaType(HttpMediaTypeNotSupportedException e) {
        ErrorCode errorCode = ErrorCode.UNSUPPORTED_MEDIA_TYPE;
        return ResponseEntity
                .status(errorCode.getStatusCode())
                .body(AppApiResponse.builder()
                        .code(errorCode.getCode())
                        .message(errorCode.getMessage())
                        .build());
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<AppApiResponse> handleNotReadable(HttpMessageNotReadableException e) {
        ErrorCode errorCode = ErrorCode.REQUEST_BODY_INVALID;
        return ResponseEntity
                .status(errorCode.getStatusCode())
                .body(AppApiResponse.builder()
                        .code(errorCode.getCode())
                        .message(errorCode.getMessage())
                        .build());
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<AppApiResponse> handleMissingParam(MissingServletRequestParameterException e) {
        ErrorCode errorCode = ErrorCode.REQUEST_PARAM_MISSING;
        return ResponseEntity
                .badRequest()
                .body(AppApiResponse.builder()
                        .code(errorCode.getCode())
                        .message(errorCode.getMessage() + ": " + e.getParameterName())
                        .build());
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<AppApiResponse> handleConstraintViolation(ConstraintViolationException e) {
        ErrorCode errorCode = ErrorCode.VALIDATION_FAILED;
        return ResponseEntity
                .badRequest()
                .body(AppApiResponse.builder()
                        .code(errorCode.getCode())
                        .message(e.getMessage())
                        .build());
    }

    @ExceptionHandler(BindException.class)
    public ResponseEntity<AppApiResponse> handleBindException(BindException e) {
        ErrorCode errorCode = ErrorCode.VALIDATION_FAILED;
        return ResponseEntity
                .badRequest()
                .body(AppApiResponse.builder()
                        .code(errorCode.getCode())
                        .message(e.getAllErrors().get(0).getDefaultMessage())
                        .build());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<AppApiResponse> handleGenericException(Exception exception) {
        ErrorCode errorCode = ErrorCode.UNCATEGORIZED_EXCEPTION;

        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(AppApiResponse.builder()
                        .code(errorCode.getCode())
                        .message(errorCode.getMessage())
                        .build());
    }
}
