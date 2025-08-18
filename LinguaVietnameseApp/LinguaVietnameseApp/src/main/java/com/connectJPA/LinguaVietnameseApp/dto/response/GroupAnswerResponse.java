package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.datatype.jsr310.ser.OffsetDateTimeSerializer;
import lombok.Data;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class GroupAnswerResponse {
    private UUID groupAnswerId;
    private UUID groupSessionId;
    private UUID lessonQuestionId;
    private UUID userId;
    private String selectedOption;
    private Boolean isCorrect;
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime answeredAt;
    private boolean isDeleted;
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime createdAt;
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime updatedAt;
}
