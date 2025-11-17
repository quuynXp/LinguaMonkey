package com.connectJPA.LinguaVietnameseApp.dto.request;

import lombok.*;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageReactionRequest {
    private UUID reactionId;
    private UUID chatMessageId;
    private OffsetDateTime sentAt;
    private UUID userId;
    private String reaction;
    private boolean isDeleted;
}
