package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MemorySummaryResponse {
    private UUID eventId;
    private String eventType; // e.g. "EVENT", "COURSE", "LIVE_SESSION"
    private String title;
    private String description;
    private OffsetDateTime joinedAt;
    private String  thumbnailUrl;
    private OffsetDateTime date;
}
