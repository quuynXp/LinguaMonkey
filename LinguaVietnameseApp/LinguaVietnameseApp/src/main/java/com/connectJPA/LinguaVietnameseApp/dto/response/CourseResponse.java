package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.enums.Country;
import com.connectJPA.LinguaVietnameseApp.enums.CourseApprovalStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseResponse {
    private UUID courseId;
    private String title;
    private UUID creatorId;
    private UUID RoomId;

    // Creator Info Enrichment
    private String creatorName;
    private String creatorAvatar;
    private String creatorNickname;
    private Country creatorCountry;
    private Boolean creatorVip;
    private Integer creatorLevel;

    private CourseApprovalStatus approvalStatus;

    private CourseVersionResponse latestPublicVersion;

    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private Integer totalStudents;

    private Double averageRating;
    private Integer reviewCount;
    private Boolean isAdminCreated;

    // Special Offer Fields
    private Integer activeDiscountPercentage;
    private BigDecimal discountedPrice;
}