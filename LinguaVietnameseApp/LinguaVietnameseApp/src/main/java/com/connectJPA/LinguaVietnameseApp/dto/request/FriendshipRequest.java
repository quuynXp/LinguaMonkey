package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.*;
import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class FriendshipRequest {
    @NotNull(message = "Requester ID is required")
    private UUID requesterId;

    @NotNull(message = "Receiver ID is required")
    private UUID receiverId;

    @NotBlank(message = "Status is required")
    private String status = "ACCEPT";

    private boolean isDeleted = false;

}
