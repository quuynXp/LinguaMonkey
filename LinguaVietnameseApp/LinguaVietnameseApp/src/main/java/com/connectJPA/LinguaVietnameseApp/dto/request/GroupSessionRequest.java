package com.connectJPA.LinguaVietnameseApp.dto.request;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Builder
public class GroupSessionRequest {
    private UUID lessonId;
    private UUID roomId;
    private UUID userId;
    private OffsetDateTime startedAt = OffsetDateTime.now();
    private OffsetDateTime endedAt;
    private boolean isDeleted = false;
}
