package com.connectJPA.LinguaVietnameseApp.dto;

import com.connectJPA.LinguaVietnameseApp.dto.response.BadgeResponse;
import lombok.*;

import java.util.List;

@Data
@Builder
public class BadgeProgressDto {
    private int totalBadgesInSystem;
    private int earnedBadgesCount;
    private List<BadgeResponse> earnedBadges; // Danh sách huy hiệu đã đạt được
}
