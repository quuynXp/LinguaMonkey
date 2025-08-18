package com.connectJPA.LinguaVietnameseApp.dto.request;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Builder
public class MessageReactionRequest {
    private UUID reactionId;
    private UUID chatMessageId;
    private OffsetDateTime sentAt;
    private UUID userId;
    private String reaction;
    private boolean isDeleted;
}
