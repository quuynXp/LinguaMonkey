package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.BadgeRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.BadgeProgressResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.BadgeResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Badge;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.entity.UserBadge;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserBadgeId;
import com.connectJPA.LinguaVietnameseApp.enums.CriteriaType;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.mapper.BadgeMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.*;
import com.connectJPA.LinguaVietnameseApp.service.BadgeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BadgeServiceImpl implements BadgeService {
    private final BadgeRepository badgeRepository;
    private final BadgeMapper badgeMapper;
    private final UserBadgeRepository userBadgeRepository;
    private final UserRepository userRepository;
    
    // Repositories for Real-time metrics
    private final LessonProgressRepository lessonProgressRepository;
    private final FriendshipRepository friendshipRepository;
    private final UserDailyChallengeRepository userDailyChallengeRepository;

    @Override
    public Page<BadgeResponse> getAllBadges(String badgeName, String languageCode, Pageable pageable) {
        Page<Badge> badges = badgeRepository.findByBadgeNameContainingAndLanguageCodeAndIsDeletedFalse(badgeName, languageCode, pageable);
        return badges.map(badgeMapper::toResponse);
    }

    /**
     * Logic Real-time:
     * 1. Lấy tất cả huy hiệu hệ thống.
     * 2. Lấy danh sách huy hiệu user ĐÃ NHẬN (claimed).
     * 3. Với mỗi huy hiệu, tính toán tiến độ hiện tại từ DB gốc (Learning, Friends, Streak...).
     * 4. Trả về response bao gồm cả tiến độ hiện tại để FE hiển thị thanh progress.
     */
    @Override
    @Transactional(readOnly = true)
    public List<BadgeProgressResponse> getBadgeProgressForUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        String userLang = user.getNativeLanguageCode() != null ? user.getNativeLanguageCode() : "vi";

        // Lấy danh sách ID các badge đã claim
        Set<UUID> achievedBadgeIds = userBadgeRepository.findBadgeIdsByUserId(userId);

        // Lấy tất cả badge hệ thống theo ngôn ngữ
        List<Badge> allBadges = badgeRepository.findAllByLanguageCodeAndIsDeletedFalse(userLang);

        // --- PRE-FETCH METRICS (Tối ưu hóa: Query 1 lần dùng cho nhiều badge) ---
        long lessonsCompleted = lessonProgressRepository.countByIdUserIdAndCompletedAtIsNotNullAndIsDeletedFalse(userId);
        long friendsMade = friendshipRepository.countAcceptedFriends(userId);
        long challengesCompleted = userDailyChallengeRepository.countByIdUserIdAndIsCompletedTrue(userId);
        int userExp = user.getExp();
        int userStreak = user.getStreak();

        List<BadgeProgressResponse> responseList = allBadges.stream().map(badge -> {
            boolean isAchieved = achievedBadgeIds.contains(badge.getBadgeId());
            long currentProgress = 0;
            int threshold = badge.getCriteriaThreshold();

            // Map CriteriaType sang Metric thực tế
            if (badge.getCriteriaType() != null) {
                switch (badge.getCriteriaType()) {
                    case LESSONS_COMPLETED -> currentProgress = lessonsCompleted;
                    case LOGIN_STREAK -> currentProgress = userStreak;
                    case FRIENDS_MADE -> currentProgress = friendsMade;
                    case DAILY_CHALLENGES_COMPLETED -> currentProgress = challengesCompleted;
                    case EXP_EARNED -> currentProgress = userExp;
                    default -> currentProgress = 0;
                }
            }

            // Cap progress tại threshold để hiển thị (ví dụ 50/50 thay vì 60/50)
            // Trừ khi đã đạt nhưng chưa claim, khi đó hiển thị max.
            long displayProgress = currentProgress;
            if (isAchieved) {
                displayProgress = threshold;
            } else if (displayProgress > threshold) {
                displayProgress = threshold;
            }

            return new BadgeProgressResponse(
                    badge.getBadgeId(),
                    badge.getBadgeName(),
                    badge.getDescription(),
                    badge.getImageUrl(),
                    badge.getCriteriaType(),
                    threshold,
                    (int) displayProgress,
                    isAchieved
            );
        }).collect(Collectors.toList());

        // Sort: Có thể nhận thưởng -> Chưa nhận -> Đã nhận
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

        // Validate Real-time (Server-side check)
        long currentMetric = 0;
        switch (badge.getCriteriaType()) {
            case CriteriaType.LESSONS_COMPLETED -> currentMetric = lessonProgressRepository.countByIdUserIdAndCompletedAtIsNotNullAndIsDeletedFalse(userId);
            case CriteriaType.LOGIN_STREAK -> currentMetric = user.getStreak();
            case CriteriaType.FRIENDS_MADE -> currentMetric = friendshipRepository.countAcceptedFriends(userId);
            case CriteriaType.DAILY_CHALLENGES_COMPLETED -> currentMetric = userDailyChallengeRepository.countByIdUserIdAndIsCompletedTrue(userId);
            case EXP_EARNED -> currentMetric = user.getExp();
        }

        if (currentMetric < badge.getCriteriaThreshold()) {
            throw new RuntimeException("Tiêu chí chưa đạt! Bạn cần cố gắng thêm.");
        }

        UserBadge userBadge = UserBadge.builder()
                .id(new UserBadgeId(badgeId, userId))
                .user(userRepository.getReferenceById(userId))
                .badge(badge)
                .earnedAt(OffsetDateTime.now())
                .isDeleted(false)
                .build();
        
        userBadgeRepository.saveAndFlush(userBadge);

        // Cộng xu thưởng
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
        Set<UUID> achievedIds = userBadgeRepository.findBadgeIdsByUserId(userId);
        return badgeRepository.findAllById(achievedIds).stream()
                .map(badgeMapper::toResponse)
                .collect(Collectors.toList());
    }
}