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
public class UserStatsResponse {
    private UUID userId;
    private long totalMessages;
    private long translationsUsed;
    private long videoCalls;
    private OffsetDateTime lastActiveAt;
    private boolean online; // computed: lastActiveAt within 5 minutes
    private int level;
    private int exp;
    private int streak;
}
