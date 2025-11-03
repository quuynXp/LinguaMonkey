package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.dto.response.BadgeResponse;
import com.connectJPA.LinguaVietnameseApp.enums.CoupleStatus;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class CoupleProfileSummary {
    private UUID coupleId;
    private UUID partnerId;
    private String partnerFullname;
    private String partnerAvatarUrl;
    private long daysTogether; // nếu đã là couple chính thức
    private CoupleStatus status; // EXPLORING, COUPLE, EXPIRED, ...
    private int coupleScore; // điểm trong event couple
    private int coupleLeaderboardRank;
    private List<BadgeResponse> coupleBadges; // achievements chung
}
