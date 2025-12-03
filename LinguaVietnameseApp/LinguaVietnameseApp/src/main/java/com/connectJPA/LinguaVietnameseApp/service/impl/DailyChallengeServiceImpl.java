package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.response.DailyChallengeUpdateResponse;
import com.connectJPA.LinguaVietnameseApp.entity.DailyChallenge;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.entity.UserDailyChallenge;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserDailyChallengeId;
import com.connectJPA.LinguaVietnameseApp.enums.ActivityType;
import com.connectJPA.LinguaVietnameseApp.enums.ChallengePeriod;
import com.connectJPA.LinguaVietnameseApp.enums.ChallengeStatus;
import com.connectJPA.LinguaVietnameseApp.enums.ChallengeType;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.DailyChallengeRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.FriendshipRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LessonProgressRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.TestSessionRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserDailyChallengeRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserLearningActivityRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.DailyChallengeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DailyChallengeServiceImpl implements DailyChallengeService {

    private final UserDailyChallengeRepository userDailyChallengeRepository;
    private final DailyChallengeRepository dailyChallengeRepository;
    private final UserRepository userRepository;

    // Inject các Repository dữ liệu nguồn để tracking
    private final LessonProgressRepository lessonProgressRepository;
    private final UserLearningActivityRepository userLearningActivityRepository;
    private final FriendshipRepository friendshipRepository;
    private final TestSessionRepository testSessionRepository; // Uncomment nếu có bảng TestResult

    @Override
    @Transactional
    public List<UserDailyChallenge> getTodayChallenges(UUID userId) {
        // 1. SYNC PROGRESS FIRST (Tự động cập nhật tiến độ trước khi trả về)
        syncChallengeProgress(userId);

        // 2. FETCH AND RETURN
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime startOfWeek = now.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).truncatedTo(ChronoUnit.DAYS);
        OffsetDateTime endOfDay = now.truncatedTo(ChronoUnit.DAYS).plusDays(1).minusNanos(1);

        List<UserDailyChallenge> challenges = userDailyChallengeRepository.findChallengesForToday(userId, startOfWeek, endOfDay);
        
        return challenges.stream()
                .sorted(Comparator.comparingInt((UserDailyChallenge c) -> {
                    if (c.getStatus() == ChallengeStatus.CAN_CLAIM) return 1;
                    if (c.getStatus() == ChallengeStatus.IN_PROGRESS) return 2;
                    if (c.getStatus() == ChallengeStatus.CLAIMED) return 3;
                    return 4;
                }))
                .collect(Collectors.toList());
    }

    /**
     * Hàm cốt lõi: Query dữ liệu thật từ các bảng log và update vào bảng UserDailyChallenge
     */
    private void syncChallengeProgress(UUID userId) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime startOfDay = now.truncatedTo(ChronoUnit.DAYS);
        OffsetDateTime startOfWeek = now.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).truncatedTo(ChronoUnit.DAYS);
        OffsetDateTime endOfDay = startOfDay.plusDays(1).minusNanos(1);

        // Lấy tất cả challenge đang active của user (bao gồm cả Daily và Weekly)
        List<UserDailyChallenge> activeChallenges = userDailyChallengeRepository.findChallengesForToday(userId, startOfWeek, endOfDay);
        
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;

        boolean isModified = false;

        for (UserDailyChallenge udc : activeChallenges) {
            // Nếu đã nhận thưởng rồi thì bỏ qua
            if (udc.getStatus() == ChallengeStatus.CLAIMED) continue;

            // Xác định khung thời gian check dữ liệu (Daily vs Weekly)
            OffsetDateTime checkStart = (udc.getChallenge().getPeriod() == ChallengePeriod.WEEKLY) ? startOfWeek : startOfDay;
            OffsetDateTime checkEnd = endOfDay; // Luôn là hiện tại/hết ngày

            int realProgress = 0;
            ChallengeType type = udc.getChallenge().getChallengeType();

            // === LOGIC TỰ ĐỘNG HÓA TỪNG LOẠI ===
            switch (type) {
                case LESSON_COMPLETED:
                    realProgress = lessonProgressRepository.countCompletedLessons(userId, checkStart, checkEnd);
                    break;

                case SPEAKING_PRACTICE:
                    // Giả sử có log activity type là SPEAKING
                    realProgress = userLearningActivityRepository.countActivitiesByType(userId, ActivityType.SPEAKING, checkStart, checkEnd);
                    break;

                case LISTENING_PRACTICE:
                    // Giả sử có log activity type là LISTENING
                    realProgress = userLearningActivityRepository.countActivitiesByType(userId, ActivityType.LISTENING, checkStart, checkEnd);
                    break;

                case READING_COMPREHENSION:
                    realProgress = userLearningActivityRepository.countActivitiesByType(userId, ActivityType.READING, checkStart, checkEnd);
                    break;

                case VOCABULARY_REVIEW:
                    // Nếu dùng UserLearningActivity cho Flashcard
                    realProgress = userLearningActivityRepository.countActivitiesByType(userId, ActivityType.FLASHCARD_REVIEW, checkStart, checkEnd);
                    break;

                case LEARNING_TIME:
                    // Tổng số phút học
                    realProgress = userLearningActivityRepository.sumLearningMinutes(userId, checkStart, checkEnd);
                    break;

                case FRIEND_ADDED:
                    realProgress = friendshipRepository.countNewFriends(userId, checkStart, checkEnd);
                    break;

                case STREAK_MAINTAIN:
                    // Streak lấy trực tiếp từ User, nhưng cần logic đặc biệt
                    // Nếu user đã check-in hôm nay -> progress = 1 (hoàn thành)
                    if (user.getLastStreakCheckDate() != null && user.getLastStreakCheckDate().equals(now.toLocalDate())) {
                        realProgress = 1; 
                    } else {
                        realProgress = 0;
                    }
                    // Nếu là Weekly streak -> Kiểm tra logic khác (ví dụ user.getStreak() >= 7)
                    if (udc.getChallenge().getPeriod() == ChallengePeriod.WEEKLY) {
                        realProgress = (user.getStreak() >= 7) ? 7 : user.getStreak();
                    }
                    break;

                case EXP_EARNED:
                    // Cần query bảng log EXP (nếu có). 
                    // Tạm thời nếu không có bảng EXP history, ta có thể dùng UserLearningActivity nếu nó có lưu expEarned.
                    // Ở đây tạm set logic manual hoặc cần thêm bảng ExpHistory.
                    // Ví dụ: realProgress = expHistoryRepository.sumExp(userId, checkStart, checkEnd);
                    break;
                
                case REVIEW_SESSION:
                    // Ví dụ check activity type TEST
                     realProgress = userLearningActivityRepository.countActivitiesByType(userId, ActivityType.TEST, checkStart, checkEnd);
                    break;

                default:
                    continue;
            }

            // Update nếu có thay đổi
            // Chú ý: Chỉ update nếu progress mới > progress cũ hoặc progress thực tế khác store (trường hợp sync lại)
            // Đối với Weekly, progress tăng dần.
            if (realProgress != udc.getProgress()) {
                udc.setProgress(realProgress);
                
                // Check hoàn thành
                if (realProgress >= udc.getTargetAmount()) {
                    udc.setStatus(ChallengeStatus.CAN_CLAIM);
                    udc.setCompleted(true);
                    if (udc.getCompletedAt() == null) {
                        udc.setCompletedAt(now);
                    }
                }
                isModified = true;
            }
        }

        if (isModified) {
            userDailyChallengeRepository.saveAll(activeChallenges);
        }
    }

    @Override
    @Transactional
    public void claimReward(UUID userId, UUID challengeId) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime startOfWeek = now.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).truncatedTo(ChronoUnit.DAYS);
        OffsetDateTime endOfDay = now.truncatedTo(ChronoUnit.DAYS).plusDays(1).minusNanos(1);

        UserDailyChallenge challenge = userDailyChallengeRepository.findClaimableChallenge(userId, challengeId, startOfWeek, endOfDay)
                .orElseThrow(() -> new RuntimeException("Nhiệm vụ chưa hoàn thành hoặc không tồn tại!"));

        if (challenge.getStatus() == ChallengeStatus.CLAIMED) {
             throw new RuntimeException("Challenge already claimed!");
        }

        challenge.setStatus(ChallengeStatus.CLAIMED);
        challenge.setClaimedAt(now);
        userDailyChallengeRepository.save(challenge);

        User user = userRepository.findById(userId).orElseThrow();
        user.setExp(user.getExp() + challenge.getExpReward());
        user.setCoins(user.getCoins() + challenge.getRewardCoins());
        userRepository.save(user);
    }

    @Override
    @Transactional
    public DailyChallengeUpdateResponse updateChallengeProgress(UUID userId, ChallengeType challengeType, int increment) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime startOfDay = now.truncatedTo(ChronoUnit.DAYS);
        OffsetDateTime startOfWeek = now.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).truncatedTo(ChronoUnit.DAYS);
        OffsetDateTime endOfDay = startOfDay.plusDays(1).minusNanos(1);

        List<UserDailyChallenge> activeChallenges = userDailyChallengeRepository.findChallengesForToday(userId, startOfWeek, endOfDay);
        
        UserDailyChallenge target = activeChallenges.stream()
            .filter(udc -> !udc.getCompleted() && udc.getChallenge().getChallengeType() == challengeType)
            .filter(udc -> {
                if (udc.getChallenge().getPeriod() == ChallengePeriod.WEEKLY) return true; 
                return udc.getAssignedAt().isAfter(startOfDay.minusNanos(1));
            })
            .findFirst()
            .orElse(null);

        if (target == null) {
             User user = userRepository.findById(userId).orElseThrow();
             String userLang = user.getNativeLanguageCode() != null ? user.getNativeLanguageCode() : "vi";

             List<DailyChallenge> systemChallenges = dailyChallengeRepository.findByLanguageCodeAndIsDeletedFalse(userLang);
             DailyChallenge matchingSystemChallenge = systemChallenges.stream()
                 .filter(dc -> dc.getChallengeType() == challengeType)
                 .findFirst()
                 .orElse(null);
             
             if (matchingSystemChallenge == null) return null;

             target = UserDailyChallenge.builder()
                 .id(UserDailyChallengeId.builder().userId(userId).challengeId(matchingSystemChallenge.getId()).assignedDate(now).build())
                 .user(userRepository.getReferenceById(userId))
                 .challenge(matchingSystemChallenge)
                 .progress(0)
                 .targetAmount(matchingSystemChallenge.getTargetAmount())
                 .status(ChallengeStatus.IN_PROGRESS)
                 .expReward(matchingSystemChallenge.getBaseExp())
                 .rewardCoins(matchingSystemChallenge.getRewardCoins())
                 .assignedAt(now)
                 .build();
        }

        target.setProgress(target.getProgress() + increment);
        int requiredTarget = target.getChallenge().getTargetAmount() > 0 ? target.getChallenge().getTargetAmount() : 1;
        boolean justCompleted = false;

        if (target.getProgress() >= requiredTarget) {
            target.setCompleted(true);
            target.setCompletedAt(now);
            target.setStatus(ChallengeStatus.CAN_CLAIM);
            justCompleted = true;
        }

        target = userDailyChallengeRepository.save(target);

        return DailyChallengeUpdateResponse.builder()
                .challengeId(target.getChallengeId())
                .title(target.getChallenge().getTitle())
                .progress(target.getProgress())
                .target(requiredTarget)
                .isCompleted(justCompleted)
                .expReward(target.getExpReward())
                .rewardCoins(target.getRewardCoins())
                .build();
    }

    @Override
    public UserDailyChallenge assignChallenge(UUID userId) {
        throw new UnsupportedOperationException("Disabled.");
    }

    @Override
    public Map<String, Object> getDailyChallengeStats(UUID userId) {
        List<UserDailyChallenge> todayChallenges = getTodayChallenges(userId);
        
        long completed = todayChallenges.stream().filter(UserDailyChallenge::getCompleted).count();
        int totalExpReward = todayChallenges.stream().mapToInt(UserDailyChallenge::getExpReward).sum();
        int totalCoins = todayChallenges.stream().mapToInt(UserDailyChallenge::getRewardCoins).sum();

        return Map.of(
                "totalChallenges", (long) todayChallenges.size(),
                "completedChallenges", completed,
                "totalExpReward", totalExpReward,
                "totalCoins", totalCoins
        );
    }

    @Override
    @Transactional
    public void completeChallenge(UUID userId, UUID challengeId) {
    }

   @Override
    @Transactional
    public void assignAllChallengesToNewUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        String userLang = (user.getNativeLanguageCode() != null && !user.getNativeLanguageCode().isEmpty())
                ? user.getNativeLanguageCode()
                : "vi";

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        
        // Fetch ALL valid challenges for the language
        List<DailyChallenge> allSystemChallenges = dailyChallengeRepository
                .findByLanguageCodeAndIsDeletedFalse(userLang);

        List<UserDailyChallenge> newChallenges = new ArrayList<>();

        for (DailyChallenge dc : allSystemChallenges) {
            UserDailyChallenge udc = UserDailyChallenge.builder()
                    .id(UserDailyChallengeId.builder()
                            .userId(userId)
                            .challengeId(dc.getId())
                            .assignedDate(now)
                            .build())
                    .user(user)
                    .challenge(dc)
                    .progress(0)
                    .targetAmount(dc.getTargetAmount())
                    .isCompleted(false)
                    .status(ChallengeStatus.IN_PROGRESS)
                    .expReward(dc.getBaseExp())
                    .rewardCoins(dc.getRewardCoins())
                    .assignedAt(now)
                    .build();
            newChallenges.add(udc);
        }

        if (!newChallenges.isEmpty()) {
            userDailyChallengeRepository.saveAll(newChallenges);
            log.info("Assigned {} challenges to new user {}", newChallenges.size(), userId);
        }
    }
}