package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.*;

import java.io.Serializable;
import java.time.OffsetDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatStatsResponse implements Serializable {
    private static final long serialVersionUID = 1L;
    
    private long totalMessages;
    private long translationsUsed;
    private long videoCalls;
    private long joinedRooms;
    private OffsetDateTime lastActiveAt;
    private boolean online;
    private Integer level;
    private Integer exp;
    private Integer streak;
}