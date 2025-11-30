package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseDiscountRequest {
    @NotNull(message = "Course ID is required")
    private UUID courseId;

    @NotNull(message = "Discount percentage is required")
    @Min(value = 0, message = "Discount percentage must be at least 0")
    @Max(value = 100, message = "Discount percentage must not exceed 100")
    private Integer discountPercentage;

    private OffsetDateTime startDate;
    private OffsetDateTime endDate;
    private String code;
    private boolean isActive = true;
    private boolean isDeleted = false;
}
