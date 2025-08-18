package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.datatype.jsr310.ser.OffsetDateTimeSerializer;
import lombok.Data;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class RoomMemberResponse {
    private UUID roomId;
    private UUID userId;
    private String role;
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime joinedAt;
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime endAt;
    private boolean isDeleted;
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime createdAt;
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime updatedAt;
}
