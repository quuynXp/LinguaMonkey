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
import com.connectJPA.LinguaVietnameseApp.enums.CriteriaType;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.mapper.BadgeMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.*;
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
    private final UserLearningActivityRepository userLearningActivityRepository;
    // Repositories needed for criteria checks
    private final VideoCallRepository videoCallRepository;
    private final AdmirationRepository admirationRepository;
    private final FriendshipRepository friendshipRepository;
    private final ChatMessageRepository chatMessageRepository;

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
        
        List<Badge> starterBadges = badgeRepository.findByBadgeTypeAndLanguageCodeAndIsDeletedFalse(BadgeType.REGISTRATION, lang);
        
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

        List<Badge> allBadges = badgeRepository.findAllByLanguageCodeAndIsDeletedFalse(userLang);
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
            long currentProgress = 0;

            if (isOwned) {
                currentProgress = badge.getCriteriaThreshold();
            } else {
                currentProgress = calculateRealTimeProgress(user, badge);
            }

            // Cap at threshold
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
                    .currentUserProgress((int) currentProgress)
                    .isAchieved(isOwned)
                    .build();
            
            progressList.add(response);
        }

        return progressList;
    }

    /**
     * Calculates progress based on the 5 types requested + others
     */
    private long calculateRealTimeProgress(User user, Badge badge) {
        CriteriaType criteria = badge.getCriteriaType();
        if (criteria == null) return 0;

        switch (criteria) {
            case VIDEO_CALL: // "Gương mặt thân quen"
                return videoCallRepository.countCompletedCallsForUser(user.getUserId());
            
            case GIVE_ADMIRATION: // "Trái tim vàng"
                return admirationRepository.countBySenderId(user.getUserId());
            
            case FRIENDS_MADE: // "Mạng lưới toàn cầu"
                return friendshipRepository.countAcceptedFriends(user.getUserId());
            
            case SEND_MESSAGE: // "Đại sứ thân thiện"
                return chatMessageRepository.countDistinctReceiversBySenderId(user.getUserId());
            
            case LEARNING_TIME: // "Học giả uyên bác"
                return userLearningActivityRepository.getTotalLearningMinutes(user.getUserId());

            case LOGIN_STREAK:
                return user.getStreak();

            default:
                return 0;
        }
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
        
        long progress = calculateRealTimeProgress(user, badge);

        if (progress < badge.getCriteriaThreshold()) {
            throw new AppException(ErrorCode.BADGE_CRITERIA_NOT_MET); 
        }

        assignBadgeToUser(userId, badgeId);
    }
}