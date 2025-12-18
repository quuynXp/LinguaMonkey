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
import com.connectJPA.LinguaVietnameseApp.repository.jpa.*;
import com.connectJPA.LinguaVietnameseApp.mapper.UserDailyChallengeMapper;
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
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;
import java.util.function.Predicate;
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

    private void syncProgress(UUID userId, ChallengePeriod period, OffsetDateTime start, OffsetDateTime end) {
        List<UserDailyChallenge> activeChallenges = userDailyChallengeRepository.findActiveChallenges(
                userId, period, start, end);

        for (UserDailyChallenge udc : activeChallenges) {
            ChallengeType type = udc.getChallenge().getChallengeType();
            long actualCount = 0;

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

    private static <T> Predicate<T> distinctByKey(Function<? super T, ?> keyExtractor) {
        Set<Object> seen = ConcurrentHashMap.newKeySet();
        return t -> seen.add(keyExtractor.apply(t));
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

        boolean needDaily = dailies.size() < 3; 
        boolean needWeekly = weeklies.size() < 2; 

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

        List<UserDailyChallenge> finalDailies = dailies.stream()
                .filter(distinctByKey(udc -> udc.getChallenge().getId()))
                .sorted(getComparator())
                .limit(3)
                .collect(Collectors.toList());

        List<UserDailyChallenge> finalWeeklies = weeklies.stream()
                .filter(distinctByKey(udc -> udc.getChallenge().getId()))
                .sorted(getComparator())
                .limit(2)
                .collect(Collectors.toList());

        return Stream.concat(finalDailies.stream(), finalWeeklies.stream())
                .collect(Collectors.toList());
    }

    private Comparator<UserDailyChallenge> getComparator() {
        return Comparator.comparingInt((UserDailyChallenge c) -> {
            if (c.getStatus() == ChallengeStatus.CAN_CLAIM) return 1;
            if (c.getStatus() == ChallengeStatus.IN_PROGRESS) return 2;
            if (c.getStatus() == ChallengeStatus.CLAIMED) return 3;
            return 4;
        });
    }

    private void assignMissingChallengesV2(UUID userId, 
                                           List<UserDailyChallenge> existingDailies, 
                                           List<UserDailyChallenge> existingWeeklies,
                                           boolean assignDaily, 
                                           boolean assignWeekly) {
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        String userLang = (user.getNativeLanguageCode() != null) ? user.getNativeLanguageCode() : "en";
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

            int needed = Math.max(0, 3 - existingDailies.size());
            if (needed > 0) {
                List<DailyChallenge> availableDailies = allChallenges.stream()
                    .filter(c -> ChallengePeriod.DAILY.name().equalsIgnoreCase(String.valueOf(c.getPeriod())))
                    .filter(c -> !existingIds.contains(c.getId()))
                    .collect(Collectors.toList());
                Collections.shuffle(availableDailies);
                availableDailies.stream().limit(needed).forEach(dc -> newAssignments.add(createTransferObject(user, dc, now)));
            }
        }

        if (assignWeekly) {
            Set<UUID> existingIds = existingWeeklies.stream()
                .map(udc -> udc.getChallenge().getId())
                .collect(Collectors.toSet());

            int needed = Math.max(0, 2 - existingWeeklies.size());
            if (needed > 0) {
                List<DailyChallenge> availableWeeklies = allChallenges.stream()
                    .filter(c -> ChallengePeriod.WEEKLY.name().equalsIgnoreCase(String.valueOf(c.getPeriod())))
                    .filter(c -> !existingIds.contains(c.getId()))
                    .collect(Collectors.toList());
                Collections.shuffle(availableWeeklies);
                availableWeeklies.stream().limit(needed).forEach(dc -> newAssignments.add(createTransferObject(user, dc, now)));
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
                
                sendChallengeCompletedNotification(userId, target);
            }
            
            if (primaryUpdated == null) {
                primaryUpdated = target;
            } else if (target.getChallenge().getLanguageCode().equals(userLang)) {
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
        
        DailyChallenge dailyChallenge = dailyChallengeRepository.findById(challengeId)
                .orElseThrow(() -> new AppException(ErrorCode.CHALLENGE_NOT_FOUND));
        
        OffsetDateTime start, end;
        if (dailyChallenge.getPeriod() == ChallengePeriod.DAILY) {
            start = now.truncatedTo(ChronoUnit.DAYS);
            end = start.plusDays(1).minusNanos(1);
        } else if (dailyChallenge.getPeriod() == ChallengePeriod.WEEKLY) {
            start = now.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).truncatedTo(ChronoUnit.DAYS);
            end = start.plusDays(7).minusNanos(1);
        } else {
            start = now.truncatedTo(ChronoUnit.DAYS);
            end = start.plusDays(1).minusNanos(1);
        }
        
        List<UserDailyChallenge> candidateChallenges = userDailyChallengeRepository.findClaimableChallenge(userId, challengeId, start, end);
        
        if (candidateChallenges.isEmpty()) {
             throw new AppException(ErrorCode.CHALLENGE_NOT_COMPLETED);
        }

        UserDailyChallenge challenge = candidateChallenges.get(0);
        if (candidateChallenges.size() > 1) {
            log.warn("Found duplicate challenges for user {} and challenge {}. Cleaning up...", userId, challengeId);
            for (int i = 1; i < candidateChallenges.size(); i++) {
                UserDailyChallenge duplicate = candidateChallenges.get(i);
                duplicate.setDeleted(true); 
                userDailyChallengeRepository.save(duplicate);
            }
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