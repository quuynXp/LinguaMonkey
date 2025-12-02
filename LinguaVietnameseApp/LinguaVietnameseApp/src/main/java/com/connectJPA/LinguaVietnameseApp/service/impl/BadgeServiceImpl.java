package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.BadgeRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.BadgeProgressResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.BadgeResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Badge;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.entity.UserBadge;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserBadgeId;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.mapper.BadgeMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.*;
import com.connectJPA.LinguaVietnameseApp.service.BadgeService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BadgeServiceImpl implements BadgeService {
    private final BadgeRepository badgeRepository;
    private final BadgeMapper badgeMapper;
    private final UserBadgeRepository userBadgeRepository;
    private final UserRepository userRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final FriendshipRepository friendshipRepository;
    private final UserDailyChallengeRepository userDailyChallengeRepository;

    @Override
    public Page<BadgeResponse> getAllBadges(String badgeName, String languageCode, Pageable pageable) {
        Page<Badge> badges = badgeRepository.findByBadgeNameContainingAndLanguageCodeAndIsDeletedFalse(badgeName, languageCode, pageable);
        return badges.map(badgeMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BadgeProgressResponse> getBadgeProgressForUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        String userLang = user.getNativeLanguageCode() != null ? user.getNativeLanguageCode() : "en";

        Set<UUID> achievedBadgeIds = userBadgeRepository.findBadgeIdsByUserId(userId);

        List<Badge> allBadges = badgeRepository.findAllByLanguageCodeAndIsDeletedFalse(userLang);

        long lessonsCompleted = lessonProgressRepository.countById_UserIdAndCompletedAtIsNotNull(userId);
        long friendsMade = friendshipRepository.countAcceptedFriends(userId);
        long challengesCompleted = userDailyChallengeRepository.countByIdUserIdAndIsCompletedTrue(userId);
        int userExp = user.getExp();
        int userStreak = user.getStreak();

        List<BadgeProgressResponse> responseList = allBadges.stream().map(badge -> {
            boolean isAchieved = achievedBadgeIds.contains(badge.getBadgeId());
            int currentUserProgress = 0;
            int threshold = badge.getCriteriaThreshold();

            switch (badge.getCriteriaType()) {
                case LESSONS_COMPLETED -> currentUserProgress = (int) lessonsCompleted;
                case LOGIN_STREAK -> currentUserProgress = userStreak;
                case FRIENDS_MADE -> currentUserProgress = (int) friendsMade;
                case DAILY_CHALLENGES_COMPLETED -> currentUserProgress = (int) challengesCompleted;
                case EXP_EARNED -> currentUserProgress = userExp;
            }

            if (!isAchieved && currentUserProgress > threshold) {
                currentUserProgress = threshold;
            }
            if (isAchieved) {
                currentUserProgress = threshold;
            }

            return new BadgeProgressResponse(
                    badge.getBadgeId(),
                    badge.getBadgeName(),
                    badge.getDescription(),
                    badge.getImageUrl(),
                    badge.getCriteriaType(),
                    threshold,
                    currentUserProgress,
                    isAchieved
            );
        }).collect(Collectors.toList());

        return responseList.stream()
                .sorted(Comparator.comparingInt((BadgeProgressResponse b) -> {
                    boolean canClaim = !b.isAchieved() && b.getCurrentUserProgress() >= b.getCriteriaThreshold();

                    if (canClaim) return 1;
                    if (!b.isAchieved()) return 2;
                    return 3;
                }))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void claimBadge(UUID userId, UUID badgeId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Badge badge = badgeRepository.findById(badgeId)
                .orElseThrow(() -> new AppException(ErrorCode.BADGE_NOT_FOUND));

        if (userBadgeRepository.existsById(new UserBadgeId(badgeId, userId))) {
            throw new RuntimeException("Badge already claimed!");
        }

        long currentMetric = 0;
        switch (badge.getCriteriaType()) {
            case LESSONS_COMPLETED -> currentMetric = lessonProgressRepository.countById_UserIdAndCompletedAtIsNotNull(userId);
            case LOGIN_STREAK -> currentMetric = user.getStreak();
            case FRIENDS_MADE -> currentMetric = friendshipRepository.countAcceptedFriends(userId);
            case DAILY_CHALLENGES_COMPLETED -> currentMetric = userDailyChallengeRepository.countByIdUserIdAndIsCompletedTrue(userId);
            case EXP_EARNED -> currentMetric = user.getExp();
        }

        if (currentMetric < badge.getCriteriaThreshold()) {
            throw new RuntimeException("Criteria not met yet!");
        }

        UserBadge userBadge = UserBadge.builder()
                .id(new UserBadgeId(badgeId, userId))
                .user(userRepository.getReferenceById(userId))
                .badge(badge)
                .isDeleted(false)
                .build();
        
        userBadgeRepository.saveAndFlush(userBadge);

        user.setCoins(user.getCoins() + badge.getCoins());
        userRepository.save(user);
    }

    @Override
    public BadgeResponse getBadgeById(UUID id) {
        Badge badge = badgeRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.BADGE_NOT_FOUND));
        return badgeMapper.toResponse(badge);
    }

    @Override
    @Transactional
    public BadgeResponse createBadge(BadgeRequest request) {
        Badge badge = badgeMapper.toEntity(request);
        return badgeMapper.toResponse(badgeRepository.save(badge));
    }

    @Override
    @Transactional
    public BadgeResponse updateBadge(UUID id, BadgeRequest request) {
        Badge badge = badgeRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.BADGE_NOT_FOUND));
        badgeMapper.updateEntityFromRequest(request, badge);
        return badgeMapper.toResponse(badgeRepository.save(badge));
    }

    @Override
    @Transactional
    public void deleteBadge(UUID id) {
        Badge badge = badgeRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.BADGE_NOT_FOUND));
        badge.setDeleted(true);
        badgeRepository.save(badge);
    }

    @Override
    public List<BadgeResponse> getBadgesForUser(UUID userId) {
        throw new UnsupportedOperationException("Unimplemented method 'getBadgesForUser'");
    }
}