package com.connectJPA.LinguaVietnameseApp.dto.request;

import com.connectJPA.LinguaVietnameseApp.enums.ContentType;
import com.connectJPA.LinguaVietnameseApp.enums.RepeatType;
import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MemorizationRequest {
    @NotNull
    private UUID userId;

    private ContentType contentType;

    private UUID contentId;

    private String noteText;

    private String definition;
    private String example;
    private String imageUrl;
    private String audioUrl;

    private boolean isFavorite;

    private boolean isReminderEnabled;
    private String reminderTime;
    private RepeatType repeatType;
    private String reminderTitle;
}