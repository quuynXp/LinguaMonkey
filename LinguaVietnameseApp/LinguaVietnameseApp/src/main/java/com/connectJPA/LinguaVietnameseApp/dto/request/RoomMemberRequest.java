package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.*;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Builder
public class RoomMemberRequest {
    @NotNull(message = "Room ID is required")
    private UUID roomId;

    @NotNull(message = "User ID is required")
    private UUID userId;

    private String role;

    private boolean isDeleted = false;
}
