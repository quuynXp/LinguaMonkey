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

    /**
     * Xử lý lỗi 400 Bad Request - Body không đọc được (ví dụ: JSON sai cú pháp).
     * Lỗi này an toàn để hiển thị (userFacing = true).
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<AppApiResponse> handleNotReadable(HttpMessageNotReadableException e) {
        return buildErrorResponse(ErrorCode.REQUEST_BODY_INVALID);
    }

    /**
     * Xử lý lỗi 400 Bad Request - Thiếu request parameter.
     * Lỗi này an toàn để hiển thị (userFacing = true).
     */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<AppApiResponse> handleMissingParam(MissingServletRequestParameterException e) {
        // Truyền tên param bị thiếu làm argument để format message
        // Giả sử messages.properties có: error.request_param_missing=Required parameter is missing: {0}
        return buildErrorResponse(ErrorCode.REQUEST_PARAM_MISSING, e.getParameterName());
    }

    // =================================================================================
    // == XỬ LÝ CÁC LỖI VALIDATION (400) - TRƯỜNG HỢP ĐẶC BIỆT
    // =================================================================================
    // Đối với các lỗi validation, message đã được định nghĩa ở annotation (@NotBlank(message="..."))
    // và đã thân thiện với người dùng. Chúng ta sẽ gửi thẳng message đó về FE.

    /**
     * Xử lý lỗi validation từ @Valid trên RequestBody.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<AppApiResponse> handleMethodArgNotValid(MethodArgumentNotValidException exception) {
        ErrorCode errorCode = ErrorCode.VALIDATION_FAILED; // Mã lỗi chung cho validation

        // Lấy message lỗi đầu tiên từ field bị vi phạm
        String userMessage = "Validation failed"; // Fallback
        if (exception.getFieldError() != null) {
            userMessage = exception.getFieldError().getDefaultMessage();
        }

        return ResponseEntity
                .status(errorCode.getStatusCode())
                .body(AppApiResponse.builder()
                        .code(errorCode.getCode())
                        .message(userMessage) // Trả về message validation cụ thể
                        .build());
    }

    /**
     * Xử lý lỗi validation từ @Validated trên các tham số (ví dụ: @RequestParam).
     */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<AppApiResponse> handleConstraintViolation(ConstraintViolationException e) {
        ErrorCode errorCode = ErrorCode.VALIDATION_FAILED;

        // Lấy message lỗi đầu tiên từ vi phạm
        String userMessage = e.getConstraintViolations().iterator().next().getMessage();

        return ResponseEntity
                .status(errorCode.getStatusCode())
                .body(AppApiResponse.builder()
                        .code(errorCode.getCode())
                        .message(userMessage) // Trả về message validation cụ thể
                        .build());
    }

    /**
     * Xử lý lỗi validation từ data binding (ví dụ: bind form data vào DTO).
     */
    @ExceptionHandler(BindException.class)
    public ResponseEntity<AppApiResponse> handleBindException(BindException e) {
        ErrorCode errorCode = ErrorCode.VALIDATION_FAILED;

        // Lấy message lỗi đầu tiên từ field
        String userMessage = "Validation failed"; // Fallback
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

    // =================================================================================
    // == LỖI 500 (FALLBACK)
    // =================================================================================

    /**
     * Xử lý tất cả các Exception còn lại (lỗi 500).
     * Lỗi này không bao giờ được hiển thị chi tiết (userFacing = false).
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<AppApiResponse> handleGenericException(Exception exception) {
        // **QUAN TRỌNG: Log lỗi 500 để debug**
        log.error("Unhandled internal server error: {}", exception.getMessage(), exception);

        // Trả về lỗi UNCATEGORIZED_EXCEPTION (500), hàm helper sẽ dùng message chung.
        return buildErrorResponse(ErrorCode.UNCATEGORIZED_EXCEPTION);
    }


    // =================================================================================
    // == HELPER METHOD
    // =================================================================================

    /**
     * Helper để xây dựng ResponseEntity dựa trên ErrorCode và cờ userFacing.
     *
     * @param errorCode Mã lỗi Enum
     * @param args      Các tham số (nếu có) để format message (ví dụ: {0}, {1})
     * @return ResponseEntity chứa AppApiResponse đã được chuẩn hóa
     */
    private ResponseEntity<AppApiResponse> buildErrorResponse(ErrorCode errorCode, Object... args) {
        String messageKey;
        Object[] messageArgs = args;
        Locale locale = LocaleContextHolder.getLocale(); // Lấy locale của user (từ header Accept-Language)

        if (errorCode.isUserFacing()) {
            // Lỗi an toàn -> Lấy message key cụ thể từ enum
            messageKey = errorCode.getMessage();
        } else {
            // Lỗi hệ thống/bảo mật -> Lấy message key chung, an toàn
            // Chúng ta sẽ định nghĩa key này trong messages.properties
            messageKey = "error.generic_internal";
            messageArgs = null; // Không cần args cho message chung
        }

        String message;
        try {
            // Dịch message key sang ngôn ngữ của user
            message = messageSource.getMessage(messageKey, messageArgs, locale);
        } catch (Exception e) {
            // Fallback nếu không tìm thấy key (không nên xảy ra)
            log.warn("Missing message key in properties file: {}", messageKey);
            message = (errorCode.isUserFacing())
                    ? "An error occurred. Please contact support."
                    : "An internal error occurred. Please try again later.";
        }

        // Xây dựng body response
        AppApiResponse body = AppApiResponse.builder()
                .code(errorCode.getCode())
                .message(message)
                .build();

        // Trả về ResponseEntity với HTTP status chính xác
        return ResponseEntity
                .status(errorCode.getStatusCode())
                .body(body);
    }
}