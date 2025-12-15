package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.DailyChallengeUpdateResponse;
import com.connectJPA.LinguaVietnameseApp.entity.DailyChallenge;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.entity.UserDailyChallenge;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserDailyChallengeId;
import com.connectJPA.LinguaVietnameseApp.enums.ChallengePeriod;
import com.connectJPA.LinguaVietnameseApp.enums.ChallengeStatus;
import com.connectJPA.LinguaVietnameseApp.enums.ChallengeType;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.service.DailyChallengeService;
import com.connectJPA.LinguaVietnameseApp.service.NotificationService;
import com.connectJPA.LinguaVietnameseApp.dto.response.UserDailyChallengeResponse;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.connectJPA.LinguaVietnameseApp.mapper.UserDailyChallengeMapper;

import java.time.DayOfWeek;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Slf4j
public class DailyChallengeServiceImpl implements DailyChallengeService {

    private final UserDailyChallengeRepository userDailyChallengeRepository;
    private final DailyChallengeRepository dailyChallengeRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final VideoCallRepository videoCallRepository;
    private final AdmirationRepository admirationRepository;
    private final FriendshipRepository friendshipRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserDailyChallengeMapper dailyChallengeMapper;
    private final UserLearningActivityRepository userLearningActivityRepository;

    /**
     * Sửa tên hàm và tích hợp logic tính toán cho cả DAILY và WEEKLY
     */
    private void syncProgress(UUID userId, ChallengePeriod period, OffsetDateTime start, OffsetDateTime end) {
        List<UserDailyChallenge> activeChallenges = userDailyChallengeRepository.findActiveChallenges(
                userId, period, start, end);

        for (UserDailyChallenge udc : activeChallenges) {
            ChallengeType type = udc.getChallenge().getChallengeType();
            long actualCount = 0;

            // Tính toán progress dựa trên type và period (thông qua start/end date)
            switch (type) {
                case LEARNING_TIME:
                    actualCount = userLearningActivityRepository.sumLearningMinutes(userId, start, end);
                    break;

                case VIDEO_CALL:
                    actualCount = videoCallRepository.countCompletedCallsForUserBetween(userId, start, end);
                    break;

                case GIVE_ADMIRATION:
                    actualCount = admirationRepository.countBySenderIdAndCreatedAtBetween(userId, start, end);
                    break;

                case FRIEND_ADDED:
                    actualCount = friendshipRepository.countNewFriends(userId, start, end);
                    break;

                case SEND_MESSAGE:
                    actualCount = chatMessageRepository.countDistinctReceiversBySenderIdAndSentAtBetween(userId, start, end);
                    break;

                default:
                    continue;
            }

            updateProgress(udc, (int) actualCount);
        }
    }

    private void updateProgress(UserDailyChallenge udc, int currentCount) {
        if (udc.getProgress() != currentCount) {
            udc.setProgress(currentCount);
            if (currentCount >= udc.getTargetAmount() && udc.getStatus() == ChallengeStatus.IN_PROGRESS) {
                udc.setStatus(ChallengeStatus.CAN_CLAIM);
                udc.setCompletedAt(OffsetDateTime.now());
                udc.setCompleted(true);
            }
            userDailyChallengeRepository.save(udc);
        }
    }

    @Override
    @Transactional
    public List<UserDailyChallenge> getTodayChallenges(UUID userId) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime startOfDay = now.truncatedTo(ChronoUnit.DAYS);
        OffsetDateTime endOfDay = startOfDay.plusDays(1).minusNanos(1);
        OffsetDateTime startOfWeek = now.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).truncatedTo(ChronoUnit.DAYS);
        OffsetDateTime endOfWeek = startOfWeek.plusDays(7).minusNanos(1);

        List<UserDailyChallenge> dailies = userDailyChallengeRepository.findChallengesByPeriodAndDateRange(
                userId, ChallengePeriod.DAILY, startOfDay, endOfDay
        );

        List<UserDailyChallenge> weeklies = userDailyChallengeRepository.findChallengesByPeriodAndDateRange(
                userId, ChallengePeriod.WEEKLY, startOfWeek, endOfWeek
        );

        boolean needDaily = dailies.size() < 5;
        boolean needWeekly = weeklies.size() < 5;

        if (needDaily || needWeekly) {
            assignMissingChallengesV2(userId, dailies, weeklies, needDaily, needWeekly);
            
            dailies = userDailyChallengeRepository.findChallengesByPeriodAndDateRange(
                    userId, ChallengePeriod.DAILY, startOfDay, endOfDay
            );
            weeklies = userDailyChallengeRepository.findChallengesByPeriodAndDateRange(
                    userId, ChallengePeriod.WEEKLY, startOfWeek, endOfWeek
            );
        }
        
        syncProgress(userId, ChallengePeriod.DAILY, startOfDay, endOfDay);
        syncProgress(userId, ChallengePeriod.WEEKLY, startOfWeek, endOfWeek);

        return Stream.concat(dailies.stream(), weeklies.stream())
                .sorted(Comparator.comparingInt((UserDailyChallenge c) -> {
                    if (c.getStatus() == ChallengeStatus.CAN_CLAIM) return 1;
                    if (c.getStatus() == ChallengeStatus.IN_PROGRESS) return 2;
                    if (c.getStatus() == ChallengeStatus.CLAIMED) return 3;
                    return 4;
                }))
                .collect(Collectors.toList());
    }

    private void assignMissingChallengesV2(UUID userId, 
                                          List<UserDailyChallenge> existingDailies, 
                                          List<UserDailyChallenge> existingWeeklies,
                                          boolean assignDaily, 
                                          boolean assignWeekly) {
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        
        String userLang = user.getNativeLanguageCode();
        if (userLang == null || userLang.isEmpty()) {
            userLang = "en"; 
        }

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        List<UserDailyChallenge> newAssignments = new ArrayList<>();

        List<DailyChallenge> allChallenges = dailyChallengeRepository.findByLanguageCodeAndIsDeletedFalse(userLang);
        if (allChallenges.isEmpty() && !userLang.equals("en")) {
            allChallenges = dailyChallengeRepository.findByLanguageCodeAndIsDeletedFalse("en");
        }

        if (assignDaily) {
            Set<UUID> existingIds = existingDailies.stream()
                .map(udc -> udc.getChallenge().getId())
                .collect(Collectors.toSet());

            int needed = 5 - existingDailies.size();
            
            List<DailyChallenge> availableDailies = allChallenges.stream()
                .filter(c -> ChallengePeriod.DAILY.name().equalsIgnoreCase(String.valueOf(c.getPeriod())))
                .filter(c -> !existingIds.contains(c.getId()))
                .collect(Collectors.toList());

            Collections.shuffle(availableDailies);
            
            availableDailies.stream()
                .limit(needed)
                .forEach(dc -> newAssignments.add(createTransferObject(user, dc, now)));
        }

        if (assignWeekly) {
            Set<UUID> existingIds = existingWeeklies.stream()
                .map(udc -> udc.getChallenge().getId())
                .collect(Collectors.toSet());

            int needed = 5 - existingWeeklies.size();

            List<DailyChallenge> availableWeeklies = allChallenges.stream()
                .filter(c -> ChallengePeriod.WEEKLY.name().equalsIgnoreCase(String.valueOf(c.getPeriod())))
                .filter(c -> !existingIds.contains(c.getId()))
                .collect(Collectors.toList());

            Collections.shuffle(availableWeeklies);

            availableWeeklies.stream()
                .limit(needed)
                .forEach(dc -> newAssignments.add(createTransferObject(user, dc, now)));
        }

        if (!newAssignments.isEmpty()) {
            userDailyChallengeRepository.saveAll(newAssignments);
        }
    }

    private UserDailyChallenge createTransferObject(User user, DailyChallenge dc, OffsetDateTime now) {
        return UserDailyChallenge.builder()
                .id(UserDailyChallengeId.builder()
                        .userId(user.getUserId())
                        .challengeId(dc.getId())
                        // AssignedDate nên được lưu trữ để xác định thuộc về ngày/tuần nào
                        .assignedDate(now.truncatedTo(ChronoUnit.DAYS)) 
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
    }

    @Override
    @Transactional
    public DailyChallengeUpdateResponse updateChallengeProgress(UUID userId, ChallengeType challengeType, int increment) {
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        String userLang = (user.getNativeLanguageCode() != null) ? user.getNativeLanguageCode() : "en";

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime startOfDay = now.truncatedTo(ChronoUnit.DAYS);
        OffsetDateTime startOfWeek = now.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).truncatedTo(ChronoUnit.DAYS);
        
        List<UserDailyChallenge> dailies = userDailyChallengeRepository.findActiveChallenges(userId, ChallengePeriod.DAILY, startOfDay, startOfDay.plusDays(1).minusNanos(1));
        List<UserDailyChallenge> weeklies = userDailyChallengeRepository.findActiveChallenges(userId, ChallengePeriod.WEEKLY, startOfWeek, startOfWeek.plusDays(7).minusNanos(1));

        List<UserDailyChallenge> allActive = new ArrayList<>();
        allActive.addAll(dailies);
        allActive.addAll(weeklies);

        List<UserDailyChallenge> matchingChallenges = allActive.stream()
                .filter(udc -> udc.getChallenge().getChallengeType() == challengeType)
                .filter(udc -> udc.getStatus() == ChallengeStatus.IN_PROGRESS)
                .collect(Collectors.toList());

        if (matchingChallenges.isEmpty()) {
            return null;
        }

        UserDailyChallenge primaryUpdated = null;
        boolean anyCompleted = false;

        for (UserDailyChallenge target : matchingChallenges) {
            int newProgress = target.getProgress() + increment;
            target.setProgress(newProgress);
            
            int requiredTarget = target.getTargetAmount();

            if (newProgress >= requiredTarget && target.getStatus() == ChallengeStatus.IN_PROGRESS) {
                target.setCompleted(true);
                target.setCompletedAt(now);
                target.setStatus(ChallengeStatus.CAN_CLAIM);
                anyCompleted = true;

                if (target.getChallenge().getLanguageCode().equals(userLang)) {
                    sendChallengeCompletedNotification(userId, target);
                }
            }
            
            if (target.getChallenge().getLanguageCode().equals(userLang)) {
                primaryUpdated = target;
            } else if (primaryUpdated == null) {
                primaryUpdated = target;
            }
        }

        userDailyChallengeRepository.saveAll(matchingChallenges);

        if (primaryUpdated != null) {
            return DailyChallengeUpdateResponse.builder()
                    .challengeId(primaryUpdated.getChallengeId())
                    .title(primaryUpdated.getTitle())
                    .progress(primaryUpdated.getProgress())
                    .target(primaryUpdated.getTargetAmount())
                    .isCompleted(anyCompleted)
                    .expReward(primaryUpdated.getExpReward())
                    .rewardCoins(primaryUpdated.getRewardCoins())
                    .build();
        }
        return null;
    }

    private void sendChallengeCompletedNotification(UUID userId, UserDailyChallenge challenge) {
        try {
            String title = "Challenge Completed! 🎯";
            String body = "You've completed '" + challenge.getTitle() + "'. Claim your " + challenge.getExpReward() + " EXP now!";
            
            NotificationRequest request = NotificationRequest.builder()
                    .userId(userId)
                    .title(title)
                    .content(body)
                    .type("CHALLENGE_COMPLETED")
                    .payload("{\"challengeId\":\"" + challenge.getChallengeId() + "\"}")
                    .build();
            
            notificationService.createPushNotification(request);
        } catch (Exception e) {
            log.error("Failed to send challenge completion notification", e);
        }
    }

    @Override
    @Transactional
    public void claimReward(UUID userId, UUID challengeId) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        
        // 1. Tìm Challenge gốc để xác định loại period (Daily/Weekly)
        DailyChallenge dailyChallenge = dailyChallengeRepository.findById(challengeId)
                .orElseThrow(() -> new AppException(ErrorCode.CHALLENGE_NOT_FOUND));
        
        // 2. Xác định phạm vi thời gian (start/end) dựa trên loại period
        OffsetDateTime start, end;
        if (dailyChallenge.getPeriod() == ChallengePeriod.DAILY) {
            start = now.truncatedTo(ChronoUnit.DAYS);
            end = start.plusDays(1).minusNanos(1);
        } else if (dailyChallenge.getPeriod() == ChallengePeriod.WEEKLY) {
            start = now.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).truncatedTo(ChronoUnit.DAYS);
            end = start.plusDays(7).minusNanos(1);
        } else {
            // Trường hợp không xác định, mặc định là Daily
            start = now.truncatedTo(ChronoUnit.DAYS);
            end = start.plusDays(1).minusNanos(1);
        }
        
        // SỬA LỖI: Sử dụng findClaimableChallenge (giả định query này trả về UNIQUE result) 
        // vì nó tìm kiếm dựa trên userId, challengeId, status=CAN_CLAIM và phạm vi thời gian (start/end).
        UserDailyChallenge challenge = userDailyChallengeRepository.findClaimableChallenge(userId, challengeId, start, end)
                .orElseThrow(() -> new AppException(ErrorCode.CHALLENGE_NOT_COMPLETED)); // Ném lỗi nếu không tìm thấy bản ghi CAN_CLAIM

        // Lỗi này không cần thiết nếu đã dùng findClaimableChallenge (nó đã check status)
        // if (challenge.getStatus() != ChallengeStatus.CAN_CLAIM) { 
        //      throw new AppException(ErrorCode.CHALLENGE_NOT_COMPLETED);
        // }

        if (challenge.getStatus() == ChallengeStatus.CLAIMED) {
            throw new AppException(ErrorCode.CHALLENGE_ALREADY_CLAIMED);
        }

        // 3. Cập nhật trạng thái và lưu
        challenge.setStatus(ChallengeStatus.CLAIMED);
        challenge.setClaimedAt(now);
        userDailyChallengeRepository.save(challenge);

        // 4. Cộng thưởng
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        user.setExp(user.getExp() + challenge.getExpReward());
        user.setCoins(user.getCoins() + challenge.getRewardCoins());
        userRepository.save(user);
    }

    @Override
    public UserDailyChallenge assignChallenge(UUID userId) {
        getTodayChallenges(userId);
        return null;
    }

    @Override
    public Map<String, Object> getDailyChallengeStats(UUID userId) {
        List<UserDailyChallenge> todayChallenges = getTodayChallenges(userId);
        
        long completed = todayChallenges.stream().filter(udc -> udc.getStatus() == ChallengeStatus.CAN_CLAIM || udc.getStatus() == ChallengeStatus.CLAIMED).count();
        int totalExpReward = todayChallenges.stream().filter(udc -> udc.getStatus() == ChallengeStatus.CAN_CLAIM).mapToInt(UserDailyChallenge::getExpReward).sum();
        int totalCoins = todayChallenges.stream().filter(udc -> udc.getStatus() == ChallengeStatus.CAN_CLAIM).mapToInt(UserDailyChallenge::getRewardCoins).sum();

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
        getTodayChallenges(userId);
    }
}