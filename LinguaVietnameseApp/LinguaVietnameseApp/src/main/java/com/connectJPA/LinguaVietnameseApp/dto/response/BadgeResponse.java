package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.datatype.jsr310.ser.OffsetDateTimeSerializer;

import jakarta.persistence.Column;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BadgeResponse {
    private UUID badgeId;
    private String badgeName;
    private String description;
    private String imageUrl;
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime createdAt;
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime updatedAt;
    private boolean isDeleted;
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime deletedAt;

    public BadgeResponse(UUID badgeId, String badgeName, String description, String imageUrl) {
        this.badgeId = badgeId;
        this.badgeName = badgeName;
        this.description = description;
        this.imageUrl = imageUrl;
    }

    @Column(name = "screen_route")
    private String screenRoute;
    
    @Column(name = "stack")
    private String stack;
}
