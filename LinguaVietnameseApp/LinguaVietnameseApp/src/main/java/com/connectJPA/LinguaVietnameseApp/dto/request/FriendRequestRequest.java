package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class FriendRequestRequest {
    @NotNull(message = "Requester ID is required")
    private UUID requesterId;

    @NotNull(message = "Receiver ID is required")
    private UUID receiverId;

    private String status = "pending";
    private boolean isDeleted = false;
}
