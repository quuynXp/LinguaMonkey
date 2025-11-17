package com.connectJPA.LinguaVietnameseApp.scheduler;

import com.connectJPA.LinguaVietnameseApp.repository.jpa.InvalidatedTokenRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.OffsetDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class SystemMaintenanceScheduler {

    private final InvalidatedTokenRepository invalidatedTokenRepository;
    private final RefreshTokenRepository refreshTokenRepository;

    /**
     * Chạy mỗi ngày lúc 4 giờ sáng để dọn dẹp các token cũ.
     */
    @Scheduled(cron = "0 0 4 * * ?") // 4 AM hàng ngày
    @Transactional
    public void cleanupExpiredTokens() {
        log.info("Running daily token cleanup job...");

        // Xóa các token đã bị vô hiệu hóa (JWT) đã hết hạn
        invalidatedTokenRepository.deleteByExpiryTimeBefore(OffsetDateTime.now());

        // Xóa các refresh token đã hết hạn
        refreshTokenRepository.deleteByExpiresAtBefore(Instant.now());

        // Xóa các refresh token đã bị thu hồi (revoked)
        refreshTokenRepository.deleteByIsRevokedTrue();

        log.info("Token cleanup job finished.");
    }
}