package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.enums.RepeatType;
import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
public class UserReminderResponse {
    private UUID id;
    private String title;
    private String message;
    private OffsetDateTime reminderTime;
    private OffsetDateTime reminderDate;
    private RepeatType repeatType;
    private Boolean enabled;
    private String targetType;
    private String targetId;
}