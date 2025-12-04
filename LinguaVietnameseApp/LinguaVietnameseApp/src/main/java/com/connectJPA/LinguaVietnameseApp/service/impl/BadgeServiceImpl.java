package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.BadgeRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.BadgeProgressResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.BadgeResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Badge;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.entity.UserBadge;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserBadgeId;
import com.connectJPA.LinguaVietnameseApp.enums.BadgeType;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.mapper.BadgeMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.BadgeRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserBadgeRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.BadgeService;
import com.connectJPA.LinguaVietnameseApp.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BadgeServiceImpl implements BadgeService {

    private final BadgeRepository badgeRepository;
    private final UserBadgeRepository userBadgeRepository;
    private final UserRepository userRepository;
    private final BadgeMapper badgeMapper;
    private final NotificationService notificationService;

    @Override
    public Page<BadgeResponse> getAllBadges(String badgeName, String languageCode, Pageable pageable) {
        if (badgeName != null) {
            return badgeRepository.findByBadgeNameContainingAndLanguageCodeAndIsDeletedFalse(badgeName, languageCode, pageable)
                    .map(badgeMapper::toResponse);
        }
        return badgeRepository.findByLanguageCodeAndIsDeletedFalse(languageCode, pageable)
                .map(badgeMapper::toResponse);
    }

    @Override
    public List<BadgeResponse> getBadgesForUser(UUID userId) {
        return userBadgeRepository.findByIdUserIdAndIsDeletedFalse(userId).stream()
                .map(ub -> badgeMapper.toResponse(ub.getBadge()))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void assignBadgeToUser(UUID userId, UUID badgeId) {
        if (userBadgeRepository.existsById(new UserBadgeId(badgeId, userId))) {
            return;
        }
        User user = userRepository.getReferenceById(userId);
        Badge badge = badgeRepository.findById(badgeId).orElseThrow(() -> new AppException(ErrorCode.BADGE_NOT_FOUND));

        UserBadge userBadge = UserBadge.builder()
                .id(new UserBadgeId(badgeId, userId))
                .user(user)
                .badge(badge)
                .earnedAt(OffsetDateTime.now())
                .build();

        userBadgeRepository.save(userBadge);
        sendBadgeEarnedNotification(userId, badge);
    }

    @Override
    @Transactional
    public void assignStarterBadges(UUID userId) {
        List<Badge> starterBadges = badgeRepository.findByBadgeTypeAndIsDeletedFalse(BadgeType.REGISTRATION);
        for (Badge badge : starterBadges) {
            assignBadgeToUser(userId, badge.getBadgeId());
        }
    }

    @Override
    @Transactional
    public void updateBadgeProgress(UUID userId, BadgeType type, int increment) {
        List<Badge> targetBadges = badgeRepository.findByBadgeTypeAndIsDeletedFalse(type);
        
        for (Badge badge : targetBadges) {
            if (userBadgeRepository.existsById(new UserBadgeId(badge.getBadgeId(), userId))) {
                continue; 
            }

            int currentProgress = 0; 
            if (type == BadgeType.STREAK_MILESTONE) {
                User user = userRepository.findById(userId).orElse(null);
                currentProgress = (user != null) ? user.getStreak() : 0;
            } else {
                 currentProgress += increment; 
            }

            if (currentProgress >= badge.getCriteriaValue()) {
                assignBadgeToUser(userId, badge.getBadgeId());
            }
        }
    }

    private void sendBadgeEarnedNotification(UUID userId, Badge badge) {
        try {
            NotificationRequest request = NotificationRequest.builder()
                    .userId(userId)
                    .title("New Badge Unlocked! 🏅")
                    .content("You've earned the '" + badge.getBadgeName() + "' badge.")
                    .type("BADGE_EARNED")
                    .payload("{\"badgeId\":\"" + badge.getBadgeId() + "\"}")
                    .build();
            notificationService.createPushNotification(request);
        } catch (Exception e) {
            log.error("Failed to send badge notification", e);
        }
    }

    @Override
    public List<BadgeProgressResponse> getBadgeProgressForUser(UUID userId) {
         return new ArrayList<>();
    }

    @Override
    public BadgeResponse getBadgeById(UUID id) {
        Badge badge = badgeRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.BADGE_NOT_FOUND));
        return badgeMapper.toResponse(badge);
    }

    @Override
    public BadgeResponse createBadge(BadgeRequest request) {
        Badge badge = badgeMapper.toEntity(request);
        badge = badgeRepository.save(badge);
        return badgeMapper.toResponse(badge);
    }

    @Override
    public BadgeResponse updateBadge(UUID id, BadgeRequest request) {
        Badge badge = badgeRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.BADGE_NOT_FOUND));
        badgeMapper.updateEntityFromRequest(request, badge);
        badge = badgeRepository.save(badge);
        return badgeMapper.toResponse(badge);
    }

    @Override
    public void deleteBadge(UUID id) {
        badgeRepository.deleteById(id);
    }

    @Override
    public void claimBadge(UUID userId, UUID badgeId) {
    }
}