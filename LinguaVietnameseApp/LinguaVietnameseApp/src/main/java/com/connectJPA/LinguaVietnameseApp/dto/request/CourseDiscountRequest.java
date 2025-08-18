package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.*;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Builder
public class CourseDiscountRequest {
    @NotNull(message = "Course ID is required")
    private UUID courseId;

    @NotNull(message = "Discount percentage is required")
    @Min(value = 0, message = "Discount percentage must be at least 0")
    @Max(value = 100, message = "Discount percentage must not exceed 100")
    private Integer discountPercentage;

    private OffsetDateTime startDate;
    private OffsetDateTime endDate;
    private boolean isActive = true;
    private boolean isDeleted = false;
}
