package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class UserSettingRequest {
    @NotNull(message = "User ID is required")
    private UUID userId;

    private String notificationPreferences;
    private String theme;
    private String language;

    private boolean isDeleted = false;
}
