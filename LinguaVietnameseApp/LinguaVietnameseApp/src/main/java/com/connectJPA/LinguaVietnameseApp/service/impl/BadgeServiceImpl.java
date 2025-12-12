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
        // 1. Kiểm tra xem đã sở hữu chưa để tránh trùng lặp
        UserBadgeId id = new UserBadgeId(badgeId, userId);
        if (userBadgeRepository.existsById(id)) {
            return;
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        Badge badge = badgeRepository.findById(badgeId)
                .orElseThrow(() -> new AppException(ErrorCode.BADGE_NOT_FOUND));

        // 2. Tạo UserBadge với ID rõ ràng
        UserBadge userBadge = UserBadge.builder()
                .id(id) // Quan trọng: Set EmbeddedId thủ công để tránh lỗi JPA MapsId trong một số context
                .user(user)
                .badge(badge)
                .earnedAt(OffsetDateTime.now())
                .build();

        userBadgeRepository.save(userBadge);
        
        // 3. Gửi thông báo
        sendBadgeEarnedNotification(userId, badge);
    }

    @Override
    @Transactional
    public void assignStarterBadges(UUID userId) {
        // Tìm tất cả badge có type là REGISTRATION
        List<Badge> starterBadges = badgeRepository.findByBadgeTypeAndIsDeletedFalse(BadgeType.REGISTRATION);
        
        if (starterBadges.isEmpty()) {
            log.warn("No REGISTRATION badges found in DB. New user {} gets no starter badges.", userId);
            return;
        }

        for (Badge badge : starterBadges) {
            assignBadgeToUser(userId, badge.getBadgeId());
        }
    }

    @Override
    @Transactional
    public void updateBadgeProgress(UUID userId, BadgeType type, int increment) {
        // Logic tự động check badge khi user làm hành động gì đó (như update exp, streak)
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
                 currentProgress += increment; // Với các loại cộng dồn thủ công
            }

            // Nếu đạt đủ điều kiện -> Assign luôn (hoặc để UI hiện nút Claim tùy logic)
            // Ở đây giữ logic tự động assign:
            if (currentProgress >= badge.getCriteriaThreshold()) { // Lưu ý: Dùng criteriaThreshold thay vì criteriaValue
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
        List<Badge> allBadges = badgeRepository.findAll();

        if (allBadges.isEmpty()) {
            return new ArrayList<>();
        }

        // Lấy User để check tiến độ (streak, exp, etc.)
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
                
        // Map các badge user đã sở hữu
        Map<UUID, UserBadge> ownedBadgesMap = userBadgeRepository.findByIdUserIdAndIsDeletedFalse(userId).stream()
                .collect(Collectors.toMap(ub -> ub.getBadge().getBadgeId(), Function.identity()));

        List<BadgeProgressResponse> progressList = new ArrayList<>();

        for (Badge badge : allBadges) {
            boolean isOwned = ownedBadgesMap.containsKey(badge.getBadgeId());
            int currentProgress = 0;

            // Logic tính toán progress
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

            // Cap progress
            if (currentProgress > badge.getCriteriaThreshold()) {
                currentProgress = badge.getCriteriaThreshold();
            }

            // --- FIX: Map đầy đủ fields ---
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
        // Logic Claim từ UI (nếu dùng nút Claim thay vì auto assign)
        Badge badge = badgeRepository.findById(badgeId)
                .orElseThrow(() -> new AppException(ErrorCode.BADGE_NOT_FOUND));

        UserBadgeId id = new UserBadgeId(badgeId, userId);
        if (userBadgeRepository.existsById(id)) {
            // Đã nhận rồi
            return; 
        }

        // Check điều kiện lại một lần nữa cho chắc (Server-side validation)
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        
        boolean canClaim = false;
        if (badge.getBadgeType() != null) {
            switch (badge.getBadgeType()) {
                case STREAK_MILESTONE:
                    if (user.getStreak() >= badge.getCriteriaThreshold()) canClaim = true;
                    break;
                // Add logic for other types
                default:
                    // Với các loại badge không check được từ User entity (VD: số bài học),
                    // ta tạm tin tưởng Client hoặc phải query count từ bảng learning_activity
                    canClaim = true; 
                    break;
            }
        }

        if (!canClaim) {
            throw new AppException(ErrorCode.BADGE_CRITERIA_NOT_MET); // Cần define ErrorCode này
        }

        assignBadgeToUser(userId, badgeId);
    }
}