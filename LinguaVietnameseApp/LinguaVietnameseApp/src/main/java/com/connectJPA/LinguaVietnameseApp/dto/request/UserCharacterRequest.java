package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class UserCharacterRequest {
    @NotNull(message = "User ID is required")
    private UUID userId;

    @NotNull(message = "Character3D ID is required")
    private UUID character3dId;

    private boolean isDeleted = false;
}
