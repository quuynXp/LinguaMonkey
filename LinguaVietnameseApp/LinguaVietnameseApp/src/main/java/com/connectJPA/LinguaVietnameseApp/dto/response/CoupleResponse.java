package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.datatype.jsr310.ser.OffsetDateTimeSerializer;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CoupleResponse {
    private UUID id;
    private UUID user1Id;
    private UUID user2Id;
    private String status;
    private LocalDate startDate;
    private LocalDate anniversary;
    private String sharedAvatarUrl;
    private String note;
}

