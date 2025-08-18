package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class UserLanguageRequest {
    @NotNull(message = "User ID is required")
    private UUID userId;

    @NotNull(message = "Language ID is required")
    private UUID languageId;

    private String proficiencyLevel;

    private boolean isDeleted = false;
}
