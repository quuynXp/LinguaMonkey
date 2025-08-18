package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.enums.CourseEnrollmentStatus;
import com.connectJPA.LinguaVietnameseApp.enums.PaymentStatus;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.datatype.jsr310.ser.OffsetDateTimeSerializer;
import lombok.Data;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class CourseEnrollmentResponse {
    private UUID enrollmentId;
    private UUID courseId;
    private UUID userId;
    private CourseEnrollmentStatus status;
    private PaymentStatus paymentStatus;
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime enrolledAt;
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime completedAt;
    private boolean isDeleted;
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime createdAt;
    @JsonSerialize(using = OffsetDateTimeSerializer.class)
    private OffsetDateTime updatedAt;
}
