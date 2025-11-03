package com.connectJPA.LinguaVietnameseApp.utils;

import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Lớp tiện ích để truy cập thông tin bảo mật (Security Context).
 * Giúp lấy thông tin của user đã được xác thực từ bất cứ đâu.
 */
@Component
@Slf4j
public class SecurityUtil {

    /**
     * Lấy UUID của người dùng hiện tại đã được xác thực.
     *
     * @return UUID của người dùng.
     * @throws AppException nếu không có người dùng nào được xác thực
     * (ví dụ: truy cập endpoint không được bảo vệ
     * hoặc token không hợp lệ).
     */
    public UUID getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null ||
                !authentication.isAuthenticated() ||
                "anonymousUser".equals(authentication.getPrincipal())) {

            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        String userIdStr = authentication.getName();

        if (userIdStr == null) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        try {
            return UUID.fromString(userIdStr);
        } catch (IllegalArgumentException e) {
            log.error("Authenticated user principal 'name' is not a valid UUID: {}", userIdStr, e);
            throw new AppException(ErrorCode.INVALID_TOKEN_FORMAT);
        }
    }
}
