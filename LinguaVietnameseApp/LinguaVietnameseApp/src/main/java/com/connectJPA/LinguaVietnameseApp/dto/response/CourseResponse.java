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
    private UUID roomId;

    // Creator Info
    private String creatorName;
    private String creatorAvatar;
    private String creatorNickname;
    private Country creatorCountry;
    private Boolean creatorVip;
    private Integer creatorLevel;
    

    private CourseApprovalStatus approvalStatus;

    // QUAN TRỌNG: Thêm field này để Edit Screen biết version nào đang soạn thảo
    private CourseVersionResponse latestDraftVersion; 
    
    private CourseVersionResponse latestPublicVersion;

    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private Integer totalStudents;

    private Double averageRating;
    private Integer reviewCount;
    private Boolean isAdminCreated;

    private Integer activeDiscountPercentage;
    private BigDecimal discountedPrice;
}