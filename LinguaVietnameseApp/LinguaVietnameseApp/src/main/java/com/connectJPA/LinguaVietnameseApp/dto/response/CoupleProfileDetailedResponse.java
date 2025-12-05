package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CoupleProfileDetailedResponse {
    private UUID coupleId;
    private String status; // COUPLE, IN_LOVE, EXPLORING
    
    // Partner Info
    private UUID partnerId;
    private String partnerName;
    private String partnerNickname;
    private String partnerAvatar;
    
    // Relationship Info
    private LocalDate startDate;
    private long daysInLove;
    private String sharedAvatarUrl;
}