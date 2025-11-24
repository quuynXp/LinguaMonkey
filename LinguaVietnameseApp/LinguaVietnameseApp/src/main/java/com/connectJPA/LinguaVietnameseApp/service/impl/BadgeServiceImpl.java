package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.BadgeRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.BadgeProgressResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.BadgeResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Badge;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.enums.CriteriaType;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
import com.connectJPA.LinguaVietnameseApp.mapper.BadgeMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.*;
import com.connectJPA.LinguaVietnameseApp.service.BadgeService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DataAccessException;

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
    public Page<BadgeResponse> getAllBadges(String badgeName, Pageable pageable) {
        try {
            Page<Badge> badges = badgeRepository.findByBadgeNameContainingAndIsDeletedFalse(badgeName, pageable);
            return badges.map(badgeMapper::toResponse);
        } catch (IllegalArgumentException e) {
            throw new AppException(ErrorCode.INVALID_KEY);
        } catch (DataAccessException e) {
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        } catch (Exception e) {
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }


    @Override
    @Transactional(readOnly = true)
    public List<BadgeProgressResponse> getBadgeProgressForUser(UUID userId) {
        // 1. Lấy thông tin cơ bản của user (để lấy streak, exp)
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // 2. Lấy danh sách các huy hiệu user đã sở hữu (để check 'isAchieved')
        Set<UUID> achievedBadgeIds = userBadgeRepository.findById_UserId(userId)
                .stream()
                .map(Badge::getBadgeId)
                .collect(Collectors.toSet());

        // 3. Lấy tất cả huy hiệu có trong hệ thống
        List<Badge> allBadges = badgeRepository.findAllByIsDeletedFalse();

        // 4. Tính toán "live" các chỉ số (vì không có UserStats)
        long lessonsCompleted = lessonProgressRepository.countById_UserIdAndCompletedAtIsNotNull(userId);
        long friendsMade = friendshipRepository.countAcceptedFriends(userId);
        long challengesCompleted = userDailyChallengeRepository.countByIdUserIdAndIsCompletedTrue(userId);
        int userExp = user.getExp();
        int userStreak = user.getStreak();

        // 5. Xây dựng danh sách tiến độ
        return allBadges.stream().map(badge -> {
            boolean isAchieved = achievedBadgeIds.contains(badge.getBadgeId());
            int currentUserProgress = 0;
            CriteriaType criteriaType = badge.getCriteriaType();
            int threshold = badge.getCriteriaThreshold();

            // 6. Ánh xạ criteria_type với chỉ số vừa tính
            if (criteriaType != null) {
                switch (criteriaType) {
                    case CriteriaType.LESSONS_COMPLETED:
                        currentUserProgress = (int) lessonsCompleted;
                        break;
                    case CriteriaType.LOGIN_STREAK:
                        currentUserProgress = userStreak;
                        break;
                    case CriteriaType.FRIENDS_MADE:
                        currentUserProgress = (int) friendsMade;
                        break;
                    case CriteriaType.DAILY_CHALLENGES_COMPLETED:
                        currentUserProgress = (int) challengesCompleted;
                        break;
                    case CriteriaType.EXP_EARNED:
                        currentUserProgress = userExp;
                        break;
                }
            }

            if (isAchieved) {
                currentUserProgress = threshold;
            }

            return new BadgeProgressResponse(
                    badge.getBadgeId(),
                    badge.getBadgeName(),
                    badge.getDescription(),
                    badge.getImageUrl(),
                    criteriaType,
                    threshold,
                    currentUserProgress,
                    isAchieved
            );
        }).collect(Collectors.toList());
    }

    @Override
    public BadgeResponse getBadgeById(UUID id) {
        try {
            Badge badge = badgeRepository.findByBadgeIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.BADGE_NOT_FOUND));
            return badgeMapper.toResponse(badge);
        } catch (IllegalArgumentException e) {
            throw new AppException(ErrorCode.INVALID_KEY);
        } catch (DataAccessException e) {
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        } catch (Exception e) {
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    //@CachePut(value = "badges", key = "#result.badgeId")
    public BadgeResponse createBadge(BadgeRequest request) {
        try {
            if (request == null) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            Badge badge = badgeMapper.toEntity(request);
            badge.setDeleted(false);
            badge = badgeRepository.save(badge);
            return badgeMapper.toResponse(badge);
        } catch (IllegalArgumentException e) {
            throw new AppException(ErrorCode.INVALID_KEY);
        } catch (DataAccessException e) {
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        } catch (Exception e) {
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    //@CachePut(value = "badges", key = "#id")
    //@CacheEvict(value = "badges", allEntries = true)
    public BadgeResponse updateBadge(UUID id, BadgeRequest request) {
        try {
            if (request == null) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            Badge badge = badgeRepository.findByBadgeIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.BADGE_NOT_FOUND));
            badgeMapper.updateEntityFromRequest(request, badge);
            badge = badgeRepository.save(badge);
            return badgeMapper.toResponse(badge);
        } catch (IllegalArgumentException e) {
            throw new AppException(ErrorCode.INVALID_KEY);
        } catch (DataAccessException e) {
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        } catch (Exception e) {
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    //@CacheEvict(value = "badges", key = "#id", allEntries = true)
    public void deleteBadge(UUID id) {
        try {
            Badge badge = badgeRepository.findByBadgeIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.BADGE_NOT_FOUND));
            badge.setDeleted(true);
            badgeRepository.save(badge);
            badgeRepository.softDeleteBadgeByBadgeId(id);
        } catch (IllegalArgumentException e) {
            throw new AppException(ErrorCode.INVALID_KEY);
        } catch (DataAccessException e) {
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        } catch (Exception e) {
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public List<BadgeResponse> getBadgesForUser(UUID userId) {
        List<Badge> badges = userBadgeRepository.findById_UserId(userId);
        return badges.stream()
                .map(b -> new BadgeResponse(b.getBadgeId(), b.getBadgeName(), b.getDescription(), b.getImageUrl()))
                .collect(Collectors.toList());
    }
}