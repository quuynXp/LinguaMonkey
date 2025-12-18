package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.enums.ContentType;
import com.connectJPA.LinguaVietnameseApp.enums.RepeatType;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.datatype.jsr310.ser.OffsetDateTimeSerializer;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemorizationResponse {
    private UUID memorizationId;
    private UUID userId;
    private ContentType contentType;
    private UUID contentId;
    private String noteText;
    
    private String definition;
    private String example;
    private String imageUrl;
    private String audioUrl;
    private UUID linkedFlashcardId;

    private boolean isFavorite;
    
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime createdAt;
    
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime updatedAt;

    private boolean isReminderEnabled;
    private String reminderTime;
    private RepeatType repeatType;
    private String reminderTitle;
}