package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.enums.RepeatType;

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