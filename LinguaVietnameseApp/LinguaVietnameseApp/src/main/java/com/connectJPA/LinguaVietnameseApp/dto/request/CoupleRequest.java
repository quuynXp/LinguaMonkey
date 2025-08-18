package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.*;
import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class CoupleRequest {
    @NotNull(message = "User1 ID is required")
    private UUID user1Id;

    @NotNull(message = "User2 ID is required")
    private UUID user2Id;

    private String status = "pending";
    private boolean isDeleted = false;
}
