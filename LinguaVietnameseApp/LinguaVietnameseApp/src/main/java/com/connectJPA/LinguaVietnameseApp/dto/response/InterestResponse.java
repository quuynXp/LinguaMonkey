package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class InterestResponse {
    private UUID interestId;
    private String interestName;
    private String description;
    private String icon;
    private String color;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}