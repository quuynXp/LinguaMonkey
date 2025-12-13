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
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
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
        UserBadgeId id = new UserBadgeId(badgeId, userId);
        if (userBadgeRepository.existsById(id)) {
            return;
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        Badge badge = badgeRepository.findById(badgeId)
                .orElseThrow(() -> new AppException(ErrorCode.BADGE_NOT_FOUND));

        UserBadge userBadge = UserBadge.builder()
                .id(id)
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
        User user = userRepository.findById(userId).orElse(null);
        String lang = (user != null && user.getNativeLanguageCode() != null) ? user.getNativeLanguageCode() : "en";
        
        // Fix: Only find Starter badges for the user's language
        List<Badge> starterBadges = badgeRepository.findByBadgeTypeAndLanguageCodeAndIsDeletedFalse(BadgeType.REGISTRATION, lang);
        
        // Fallback if none found for specific lang
        if (starterBadges.isEmpty() && !lang.equals("en")) {
            starterBadges = badgeRepository.findByBadgeTypeAndLanguageCodeAndIsDeletedFalse(BadgeType.REGISTRATION, "en");
        }

        for (Badge badge : starterBadges) {
            assignBadgeToUser(userId, badge.getBadgeId());
        }
    }

    @Override
    @Transactional
    public void updateBadgeProgress(UUID userId, BadgeType type, int increment) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;
        
        String lang = user.getNativeLanguageCode() != null ? user.getNativeLanguageCode() : "en";

        // Fix: Only check badges relevant to user's language
        List<Badge> targetBadges = badgeRepository.findByBadgeTypeAndLanguageCodeAndIsDeletedFalse(type, lang);

        for (Badge badge : targetBadges) {
            if (userBadgeRepository.existsById(new UserBadgeId(badge.getBadgeId(), userId))) {
                continue; 
            }

            int currentProgress = 0; 
            if (type == BadgeType.STREAK_MILESTONE) {
                currentProgress = user.getStreak();
            } else {
                 currentProgress += increment;
            }

            if (currentProgress >= badge.getCriteriaThreshold()) {
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
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        String userLang = user.getNativeLanguageCode();
        if (userLang == null || userLang.isEmpty()) userLang = "en";

        // FIX: Only load badges for current user language (or fallback)
        List<Badge> allBadges = badgeRepository.findAllByLanguageCodeAndIsDeletedFalse(userLang);
        
        // If empty (e.g. user set 'vi' but only 'en' badges exist), try fallback
        if (allBadges.isEmpty() && !userLang.equals("en")) {
            allBadges = badgeRepository.findAllByLanguageCodeAndIsDeletedFalse("en");
        }

        if (allBadges.isEmpty()) {
            return new ArrayList<>();
        }

        Map<UUID, UserBadge> ownedBadgesMap = userBadgeRepository.findByIdUserIdAndIsDeletedFalse(userId).stream()
                .collect(Collectors.toMap(ub -> ub.getBadge().getBadgeId(), Function.identity()));

        List<BadgeProgressResponse> progressList = new ArrayList<>();

        for (Badge badge : allBadges) {
            boolean isOwned = ownedBadgesMap.containsKey(badge.getBadgeId());
            int currentProgress = 0;

            if (isOwned) {
                currentProgress = badge.getCriteriaThreshold();
            } else {
                if (badge.getBadgeType() != null) {
                    switch (badge.getBadgeType()) {
                        case STREAK_MILESTONE:
                            currentProgress = user.getStreak();
                            break;
                        default:
                            currentProgress = 0;
                    }
                }
            }

            if (currentProgress > badge.getCriteriaThreshold()) {
                currentProgress = badge.getCriteriaThreshold();
            }

            BadgeProgressResponse response = BadgeProgressResponse.builder()
                    .badgeId(badge.getBadgeId())
                    .badgeName(badge.getBadgeName())
                    .description(badge.getDescription())
                    .imageUrl(badge.getImageUrl())
                    .criteriaType(badge.getCriteriaType()) 
                    .criteriaThreshold(badge.getCriteriaThreshold())
                    .currentUserProgress(currentProgress)
                    .isAchieved(isOwned)
                    .build();
            
            progressList.add(response);
        }

        return progressList;
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
    @Transactional
    public void claimBadge(UUID userId, UUID badgeId) {
        Badge badge = badgeRepository.findById(badgeId)
                .orElseThrow(() -> new AppException(ErrorCode.BADGE_NOT_FOUND));

        UserBadgeId id = new UserBadgeId(badgeId, userId);
        if (userBadgeRepository.existsById(id)) {
            return; 
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        
        boolean canClaim = false;
        if (badge.getBadgeType() != null) {
            switch (badge.getBadgeType()) {
                case STREAK_MILESTONE:
                    if (user.getStreak() >= badge.getCriteriaThreshold()) canClaim = true;
                    break;
                default:
                    canClaim = true; 
                    break;
            }
        }

        if (!canClaim) {
            throw new AppException(ErrorCode.BADGE_CRITERIA_NOT_MET); 
        }

        assignBadgeToUser(userId, badgeId);
    }
}