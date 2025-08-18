package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.BadgeRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.BadgeResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface BadgeService {
    Page<BadgeResponse> getAllBadges(String badgeName, Pageable pageable);
    BadgeResponse getBadgeById(UUID id);
    BadgeResponse createBadge(BadgeRequest request);
    BadgeResponse updateBadge(UUID id, BadgeRequest request);
    void deleteBadge(UUID id);
}