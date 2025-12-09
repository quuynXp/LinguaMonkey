package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.enums.CriteriaType;
import lombok.*;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BadgeProgressResponse {
    private UUID badgeId;
    private String badgeName;
    private String description;
    private String imageUrl;

    private CriteriaType criteriaType;
    private int criteriaThreshold;     // Mục tiêu cần đạt (ví dụ: 10)
    private int currentUserProgress; // Tiến độ hiện tại (ví dụ: 8)
    private boolean isAchieved;      // Đã đạt được chưa
}
