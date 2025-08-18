package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.entity.Role;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.datatype.jsr310.ser.OffsetDateTimeSerializer;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.Set;
import java.util.UUID;

@Data
public class UserResponse {
    private UUID userId;
    private String email;
    private String fullname;
    private String nickname;
    private String phone;
    private String avatarUrl;
    private UUID character3dId;
    private UUID badgeId;
    private UUID nativeLanguageId;
    private String authProvider;
    private String country;
    private Integer level;
    private Integer exp;
    private Integer expForCurrentLevel;
    private Integer expForNextLevel;
    private BigDecimal progress;
    private Integer streak;
    private boolean isDeleted;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
