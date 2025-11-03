package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
public class MemorySummaryResponse {
    private UUID eventId;
    private String eventType; // e.g. "EVENT", "COURSE", "LIVE_SESSION"
    private String title;
    private String description;
    private OffsetDateTime joinedAt; // thời điểm 2 user tham gia cùng event
}
