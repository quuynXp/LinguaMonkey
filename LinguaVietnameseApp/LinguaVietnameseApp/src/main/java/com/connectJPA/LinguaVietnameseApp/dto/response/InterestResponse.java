package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
public class InterestResponse {
    private UUID interestId;
    private String interestName;
    private String description;
    private String icon;
    private String color;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}