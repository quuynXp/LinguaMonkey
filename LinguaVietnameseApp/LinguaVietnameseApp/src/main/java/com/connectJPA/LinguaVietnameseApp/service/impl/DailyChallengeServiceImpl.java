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
import com.connectJPA.LinguaVietnameseApp.repository.jpa.DailyChallengeRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserDailyChallengeRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.DailyChallengeService;
import com.connectJPA.LinguaVietnameseApp.service.NotificationService;
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
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Slf4j
public class DailyChallengeServiceImpl implements DailyChallengeService {

    private final UserDailyChallengeRepository userDailyChallengeRepository;
    private final DailyChallengeRepository dailyChallengeRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public List<UserDailyChallenge> getTodayChallenges(UUID userId) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime startOfDay = now.truncatedTo(ChronoUnit.DAYS);
        OffsetDateTime endOfDay = startOfDay.plusDays(1).minusNanos(1);
        OffsetDateTime startOfWeek = now.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).truncatedTo(ChronoUnit.DAYS);
        OffsetDateTime endOfWeek = startOfWeek.plusDays(7).minusNanos(1);

        boolean hasDailyForToday = userDailyChallengeRepository.existsByUserIdAndPeriodAndDateRange(
                userId, ChallengePeriod.DAILY, startOfDay, endOfDay
        );

        boolean hasWeeklyForWeek = userDailyChallengeRepository.existsByUserIdAndPeriodAndDateRange(
                userId, ChallengePeriod.WEEKLY, startOfWeek, endOfWeek
        );

        if (!hasDailyForToday || !hasWeeklyForWeek) {
            assignMissingChallenges(userId, !hasDailyForToday, !hasWeeklyForWeek);
        }

        List<UserDailyChallenge> dailies = userDailyChallengeRepository.findChallengesByPeriodAndDateRange(
                userId, ChallengePeriod.DAILY, startOfDay, endOfDay
        );

        List<UserDailyChallenge> weeklies = userDailyChallengeRepository.findChallengesByPeriodAndDateRange(
                userId, ChallengePeriod.WEEKLY, startOfWeek, endOfWeek
        );

        return Stream.concat(dailies.stream(), weeklies.stream())
                .sorted(Comparator.comparingInt((UserDailyChallenge c) -> {
                    if (c.getStatus() == ChallengeStatus.CAN_CLAIM) return 1;
                    if (c.getStatus() == ChallengeStatus.IN_PROGRESS) return 2;
                    if (c.getStatus() == ChallengeStatus.CLAIMED) return 3;
                    return 4;
                }))
                .collect(Collectors.toList());
    }

    private void assignMissingChallenges(UUID userId, boolean assignDaily, boolean assignWeekly) {
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        
        String userLang = user.getNativeLanguageCode();
        if (userLang == null || userLang.isEmpty()) {
            userLang = "en"; 
        }

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        List<UserDailyChallenge> newAssignments = new ArrayList<>();

        if (assignDaily) {
            List<DailyChallenge> randomDailies = dailyChallengeRepository.findRandomChallengesByLangAndPeriod(
                    userLang, "DAILY", 5
            );
            if (randomDailies.isEmpty() && !userLang.equals("en")) {
                 randomDailies = dailyChallengeRepository.findRandomChallengesByLangAndPeriod("en", "DAILY", 5);
            }

            for (DailyChallenge dc : randomDailies) {
                newAssignments.add(createTransferObject(user, dc, now));
            }
        }

        if (assignWeekly) {
            // CHANGED: Limit from 1 to 5
            List<DailyChallenge> randomWeekly = dailyChallengeRepository.findRandomChallengesByLangAndPeriod(
                    userLang, "WEEKLY", 5 
            );
             if (randomWeekly.isEmpty() && !userLang.equals("en")) {
                 randomWeekly = dailyChallengeRepository.findRandomChallengesByLangAndPeriod("en", "WEEKLY", 5);
            }

            for (DailyChallenge dc : randomWeekly) {
                newAssignments.add(createTransferObject(user, dc, now));
            }
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
    }

    @Override
    @Transactional
    public DailyChallengeUpdateResponse updateChallengeProgress(UUID userId, ChallengeType challengeType, int increment) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime startOfDay = now.truncatedTo(ChronoUnit.DAYS);
        OffsetDateTime startOfWeek = now.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).truncatedTo(ChronoUnit.DAYS);
        
        List<UserDailyChallenge> dailies = userDailyChallengeRepository.findActiveByPeriod(userId, ChallengePeriod.DAILY, startOfDay);
        List<UserDailyChallenge> weeklies = userDailyChallengeRepository.findActiveByPeriod(userId, ChallengePeriod.WEEKLY, startOfWeek);

        List<UserDailyChallenge> allActive = new ArrayList<>();
        allActive.addAll(dailies);
        allActive.addAll(weeklies);

        List<UserDailyChallenge> matchingChallenges = allActive.stream()
                .filter(udc -> udc.getChallenge().getChallengeType() == challengeType)
                .filter(udc -> !udc.getCompleted())
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

                sendChallengeCompletedNotification(userId, target);
            }
            
            if (primaryUpdated == null) {
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
        
        UserDailyChallenge challenge = userDailyChallengeRepository.findById_UserIdAndId_ChallengeId(userId, challengeId)
                .orElseThrow(() -> new AppException(ErrorCode.CHALLENGE_NOT_FOUND));

        if (!challenge.getCompleted()) {
             throw new AppException(ErrorCode.CHALLENGE_NOT_COMPLETED);
        }

        if (challenge.getStatus() == ChallengeStatus.CLAIMED) {
             throw new AppException(ErrorCode.CHALLENGE_ALREADY_CLAIMED);
        }

        challenge.setStatus(ChallengeStatus.CLAIMED);
        challenge.setClaimedAt(now);
        userDailyChallengeRepository.save(challenge);

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
        assignMissingChallenges(userId, true, true);
    }
}