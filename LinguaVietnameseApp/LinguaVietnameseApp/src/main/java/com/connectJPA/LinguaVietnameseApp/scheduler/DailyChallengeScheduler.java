package com.connectJPA.LinguaVietnameseApp.scheduler;

import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.entity.DailyChallenge;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.entity.UserDailyChallenge;
import com.connectJPA.LinguaVietnameseApp.entity.UserSettings;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserDailyChallengeId;
import com.connectJPA.LinguaVietnameseApp.enums.ChallengePeriod;
import com.connectJPA.LinguaVietnameseApp.enums.ChallengeStatus;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.DailyChallengeRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserDailyChallengeRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserFcmTokenRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.DailyChallengeService;
import com.connectJPA.LinguaVietnameseApp.service.NotificationService;
import com.connectJPA.LinguaVietnameseApp.utils.NotificationI18nUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class DailyChallengeScheduler {

    private final DailyChallengeService dailyChallengeService;
    private final DailyChallengeRepository dailyChallengeRepository;
    private final UserRepository userRepository;
    private final UserDailyChallengeRepository userDailyChallengeRepository;
    private final NotificationService notificationService;
    private final UserFcmTokenRepository userFcmTokenRepository;

    private static final String TIME_ZONE = "UTC";

    @Scheduled(cron = "0 0 17 * * SUN", zone = TIME_ZONE)
    @Transactional
    public void assignWeeklyChallengesJob() {
        assignChallenges(ChallengePeriod.WEEKLY, 2);
    }

    @Scheduled(cron = "0 0 17 * * ?", zone = TIME_ZONE)
    @Transactional
    public void assignDailyChallengesJob() {
        assignChallenges(ChallengePeriod.DAILY, 3);
    }

    private void assignChallenges(ChallengePeriod period, int limit) {
        List<User> activeUsers = userRepository.findAllByIsDeletedFalse();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        
        OffsetDateTime start, end;
        if (period == ChallengePeriod.DAILY) {
            start = now.truncatedTo(ChronoUnit.DAYS);
            end = start.plusDays(1).minusNanos(1);
        } else {
            start = now.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).truncatedTo(ChronoUnit.DAYS);
            end = start.plusDays(7).minusNanos(1);
        }

        for (User user : activeUsers) {
            boolean alreadyAssigned = userDailyChallengeRepository.existsByUserIdAndPeriodAndDateRange(
                    user.getUserId(), period, start, end);

            if (alreadyAssigned) {
                continue; 
            }

            String langCode = user.getNativeLanguageCode() != null ? user.getNativeLanguageCode() : "en";
            
            List<DailyChallenge> challenges = dailyChallengeRepository
                    .findRandomChallengesByLanguageCodeAndPeriod(langCode, period.name(), limit);

            if (challenges.isEmpty() && !langCode.equals("en")) {
                challenges = dailyChallengeRepository
                    .findRandomChallengesByLanguageCodeAndPeriod("en", period.name(), limit);
            }

            if (challenges.isEmpty()) {
                continue;
            }

            for (DailyChallenge challenge : challenges) {
                UserDailyChallengeId id = UserDailyChallengeId.builder()
                        .userId(user.getUserId())
                        .challengeId(challenge.getId())
                        .assignedDate(now.truncatedTo(ChronoUnit.DAYS))
                        .stack(1)
                        .build();

                UserDailyChallenge userChallenge = UserDailyChallenge.builder()
                        .id(id)
                        .user(user)
                        .challenge(challenge)
                        .progress(0)
                        .targetAmount(challenge.getTargetAmount())
                        .status(ChallengeStatus.IN_PROGRESS)
                        .expReward(challenge.getBaseExp())
                        .rewardCoins(challenge.getRewardCoins())
                        .assignedAt(now)
                        .build();

                userDailyChallengeRepository.save(userChallenge);
            }
        }
    }

    @Scheduled(cron = "0 0/30 * * * ?", zone = TIME_ZONE)
    @Transactional
    public void suggestDailyChallenges() {
        List<UUID> userIdsWithToken = userFcmTokenRepository.findAllUserIdsWithTokens();
        if (userIdsWithToken.isEmpty()) return;
        
        List<User> activeUsers = userRepository.findAllById(userIdsWithToken);

        for (User user : activeUsers) {
            if (user.isDeleted()) continue;

            UserSettings settings = user.getUserSettings();
            if (settings == null || !settings.isDailyChallengeReminders()) continue;

            try {
                Map<String, Object> stats = dailyChallengeService.getDailyChallengeStats(user.getUserId());
                if (stats.containsKey("canAssignMore") && Boolean.TRUE.equals(stats.get("canAssignMore"))) {
                    String langCode = user.getNativeLanguageCode() != null ? user.getNativeLanguageCode() : "en";
                    String[] message = NotificationI18nUtil.getLocalizedMessage("DAILY_CHALLENGE_SUGGESTION", langCode);

                    NotificationRequest suggestion = NotificationRequest.builder()
                            .userId(user.getUserId())
                            .title(message[0])
                            .content(message[1])
                            .type("DAILY_CHALLENGE_SUGGESTION")
                            .payload("{\"screen\":\"Home\", \"action\":\"dailyChallenge\"}")
                            .build();

                    notificationService.createPushNotification(suggestion);
                }
            } catch (Exception e) {
                log.error("Error processing user {}: {}", user.getUserId(), e.getMessage());
            }
        }
    }

    @Scheduled(cron = "0 0 14 * * ?", zone = TIME_ZONE)
    @Transactional
    public void remindIncompleteChallenge() {
        List<User> users = userRepository.findAllByIsDeletedFalse();

        for (User user : users) {
            UserSettings settings = user.getUserSettings();
            if (settings == null || !settings.isDailyChallengeReminders()) continue;

            try {
                Map<String, Object> stats = dailyChallengeService.getDailyChallengeStats(user.getUserId());
                Long totalChallenges = (Long) stats.get("totalChallenges");
                Long completedChallenges = (Long) stats.get("completedChallenges");

                if (totalChallenges > completedChallenges) {
                    long remaining = totalChallenges - completedChallenges;

                    String langCode = user.getNativeLanguageCode() != null ? user.getNativeLanguageCode() : "en";
                    String[] message = NotificationI18nUtil.getLocalizedMessage("DAILY_CHALLENGE_REMINDER", langCode);

                    NotificationRequest reminder = NotificationRequest.builder()
                            .userId(user.getUserId())
                            .title(message[0])
                            .content(String.format(message[1], remaining))
                            .type("DAILY_CHALLENGE_REMINDER")
                            .payload("{\"screen\":\"Home\", \"action\":\"dailyChallenge\"}")
                            .build();

                    notificationService.createPushNotification(reminder);
                }
            } catch (Exception e) {
                log.error("Error sending reminder to user {}: {}", user.getUserId(), e.getMessage());
            }
        }
    }
}