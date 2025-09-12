package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.*;

import java.time.OffsetDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatStatsResponse {
    private long totalMessages;
    private long translationsUsed;
    private long videoCalls;
    private OffsetDateTime lastActiveAt;
    private boolean online;
    private Integer level;
    private Integer exp;
    private Integer streak;
}
