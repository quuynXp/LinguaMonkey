package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserBadgeRequest {
    @NotNull(message = "User ID is required")
    private UUID userId;

    @NotNull(message = "Badge ID is required")
    private UUID badgeId;

    private LocalDateTime earnedAt = LocalDateTime.now();
    private Boolean isDeleted = false;
}
