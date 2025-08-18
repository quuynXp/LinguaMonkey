package com.connectJPA.LinguaVietnameseApp.dto.request;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class VideoCallParticipantRequest {
    private UUID videoCallId;
    private UUID userId;
}
