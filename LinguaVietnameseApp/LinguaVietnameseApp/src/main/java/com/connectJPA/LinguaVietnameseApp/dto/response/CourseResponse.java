package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.enums.CourseApprovalStatus;
import com.connectJPA.LinguaVietnameseApp.enums.CourseType;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.datatype.jsr310.ser.OffsetDateTimeSerializer;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class CourseResponse {
    private UUID courseId;
    private String title;
    private UUID creatorId;
    private BigDecimal price;
    private CourseApprovalStatus approvalStatus;
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime createdAt;
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime updatedAt;
    private CourseVersionResponse latestPublicVersion;
}
