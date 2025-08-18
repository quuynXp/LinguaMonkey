package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class UserBadgeRequest {
    @NotNull(message = "User ID is required")
    private UUID userId;

    @NotNull(message = "Badge ID is required")
    private UUID badgeId;

    private LocalDateTime earnedAt = LocalDateTime.now();
    private boolean isDeleted = false;
}
