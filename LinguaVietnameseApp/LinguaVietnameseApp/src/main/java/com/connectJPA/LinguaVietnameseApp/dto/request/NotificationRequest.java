package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

import java.util.Map;
import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationRequest {
    private UUID id;

    @NotNull(message = "User ID is required")
    private UUID userId;

    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    private String content;

    @Size(max = 50, message = "Type must not exceed 50 characters")
    private String type;

    private String payload;

    private String fcmToken;
    private String deviceId;
    
    private boolean read = false;
    private boolean isDeleted = false;

    private Map<String, String> additionalData;
}