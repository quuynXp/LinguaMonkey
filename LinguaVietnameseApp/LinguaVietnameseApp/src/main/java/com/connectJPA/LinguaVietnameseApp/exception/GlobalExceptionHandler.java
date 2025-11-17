package com.connectJPA.LinguaVietnameseApp.exception;

import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import jakarta.validation.ConstraintViolationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.BindException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.Locale;

@Slf4j
@RestControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {

    // Inject MessageSource để xử lý i18n
    private final MessageSource messageSource;

    /**
     * Xử lý chính cho AppException tùy chỉnh.
     * Đây là Exception bạn nên throw chủ động trong code của mình.
     */
    @ExceptionHandler(AppException.class)
    public ResponseEntity<AppApiResponse> handleAppException(AppException exception) {
        // Sử dụng helper để build response dựa trên cờ userFacing
        // Truyền 'exception.getArgs()' nếu bạn muốn format message (ví dụ: "Thiếu trường: {0}")
        return buildErrorResponse(exception.getErrorCode(), exception.getArgs());
    }

    /**
     * Xử lý lỗi 403 Forbidden.
     * Lỗi này không nên hiển thị chi tiết cho user (userFacing = false).
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<AppApiResponse> handleAccessDenied(AccessDeniedException e) {
        // ErrorCode.UNAUTHORIZED (403) có userFacing = false,
        // hàm helper sẽ tự động chọn message chung.
        return buildErrorResponse(ErrorCode.UNAUTHORIZED);
    }

    /**
     * Xử lý lỗi 405 Method Not Allowed.
     * Lỗi này không nên hiển thị (userFacing = false).
     */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<AppApiResponse> handleMethodNotAllowed(HttpRequestMethodNotSupportedException e) {
        return buildErrorResponse(ErrorCode.METHOD_NOT_ALLOWED);
    }

    /**
     * Xử lý lỗi 415 Unsupported Media Type.
     * Lỗi này không nên hiển thị (userFacing = false).
     */
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<AppApiResponse> handleUnsupportedMediaType(HttpMediaTypeNotSupportedException e) {
        return buildErrorResponse(ErrorCode.UNSUPPORTED_MEDIA_TYPE);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<AppApiResponse> handleNotReadable(HttpMessageNotReadableException e) {
        return buildErrorResponse(ErrorCode.REQUEST_BODY_INVALID);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<AppApiResponse> handleMissingParam(MissingServletRequestParameterException e) {
        return buildErrorResponse(ErrorCode.REQUEST_PARAM_MISSING, e.getParameterName());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<AppApiResponse> handleMethodArgNotValid(MethodArgumentNotValidException exception) {
        ErrorCode errorCode = ErrorCode.VALIDATION_FAILED; // Mã lỗi chung cho validation

        String userMessage = "Validation failed";
        if (exception.getFieldError() != null) {
            userMessage = exception.getFieldError().getDefaultMessage();
        }

        return ResponseEntity
                .status(errorCode.getStatusCode())
                .body(AppApiResponse.builder()
                        .code(errorCode.getCode())
                        .message(userMessage)
                        .build());
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<AppApiResponse> handleConstraintViolation(ConstraintViolationException e) {
        ErrorCode errorCode = ErrorCode.VALIDATION_FAILED;

        String userMessage = e.getConstraintViolations().iterator().next().getMessage();

        return ResponseEntity
                .status(errorCode.getStatusCode())
                .body(AppApiResponse.builder()
                        .code(errorCode.getCode())
                        .message(userMessage)
                        .build());
    }

    @ExceptionHandler(BindException.class)
    public ResponseEntity<AppApiResponse> handleBindException(BindException e) {
        ErrorCode errorCode = ErrorCode.VALIDATION_FAILED;

        String userMessage = "Validation failed";
        if (e.getFieldError() != null) {
            userMessage = e.getFieldError().getDefaultMessage();
        }

        return ResponseEntity
                .status(errorCode.getStatusCode())
                .body(AppApiResponse.builder()
                        .code(errorCode.getCode())
                        .message(userMessage) // Trả về message validation cụ thể
                        .build());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<AppApiResponse> handleGenericException(Exception exception) {
        // **QUAN TRỌNG: Log lỗi 500 để debug**
        log.error("Unhandled internal server error: {}", exception.getMessage(), exception);

        return buildErrorResponse(ErrorCode.UNCATEGORIZED_EXCEPTION);
    }

    private ResponseEntity<AppApiResponse> buildErrorResponse(ErrorCode errorCode, Object... args) {
        String messageKey;
        Object[] messageArgs = args;
        Locale locale = LocaleContextHolder.getLocale();

        if (errorCode.isUserFacing()) {
            messageKey = errorCode.getMessage();
        } else {
            messageKey = "error.generic_internal";
            messageArgs = null;
        }

        String message;
        try {
            message = messageSource.getMessage(messageKey, messageArgs, locale);
        } catch (Exception e) {
            log.warn("Missing message key in properties file: {}", messageKey);
            message = (errorCode.isUserFacing())
                    ? "An error occurred. Please contact support."
                    : "An internal error occurred. Please try again later.";
        }

        AppApiResponse body = AppApiResponse.builder()
                .code(errorCode.getCode())
                .message(message)
                .build();

        return ResponseEntity
                .status(errorCode.getStatusCode())
                .body(body);
    }
}