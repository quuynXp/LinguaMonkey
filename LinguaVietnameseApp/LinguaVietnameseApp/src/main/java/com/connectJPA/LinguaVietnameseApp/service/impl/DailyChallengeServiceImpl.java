package com.connectJPA.LinguaVietnameseApp.service.impl;

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
import lombok.RequiredArgsConstructor;
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
public class DailyChallengeServiceImpl implements DailyChallengeService {

    private final UserDailyChallengeRepository userDailyChallengeRepository;
    private final DailyChallengeRepository dailyChallengeRepository;
    private final UserRepository userRepository;

    @Override
    public List<UserDailyChallenge> getTodayChallenges(UUID userId) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        
        OffsetDateTime startOfDay = now.truncatedTo(ChronoUnit.DAYS);
        OffsetDateTime endOfDay = startOfDay.plusDays(1).minusNanos(1);

        OffsetDateTime startOfWeek = now.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).truncatedTo(ChronoUnit.DAYS);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        String userLang = (user.getNativeLanguageCode() != null && !user.getNativeLanguageCode().isEmpty()) 
                          ? user.getNativeLanguageCode() 
                          : "vi";

        List<DailyChallenge> allSystemChallenges = dailyChallengeRepository
                .findByLanguageCodeAndIsDeletedFalse(userLang);

        List<UserDailyChallenge> userProgressList = userDailyChallengeRepository.findChallengesForToday(userId, startOfWeek, endOfDay);
        
        List<UserDailyChallenge> result = new ArrayList<>();

        for (DailyChallenge sysChallenge : allSystemChallenges) {
            UserDailyChallenge existingProgress = null;

            if (sysChallenge.getPeriod() == ChallengePeriod.WEEKLY) {
                existingProgress = userProgressList.stream()
                    .filter(u -> u.getChallenge().getId().equals(sysChallenge.getId()))
                    .filter(u -> !u.getAssignedAt().isBefore(startOfWeek))
                    .findFirst()
                    .orElse(null);
            } else {
                existingProgress = userProgressList.stream()
                    .filter(u -> u.getChallenge().getId().equals(sysChallenge.getId()))
                    .filter(u -> u.getAssignedAt().isAfter(startOfDay.minusNanos(1)) && u.getAssignedAt().isBefore(endOfDay.plusNanos(1)))
                    .findFirst()
                    .orElse(null);
            }

            if (existingProgress != null) {
                result.add(existingProgress);
            } else {
                UserDailyChallenge virtualRecord = UserDailyChallenge.builder()
                        .id(UserDailyChallengeId.builder()
                                .userId(userId)
                                .challengeId(sysChallenge.getId())
                                .assignedDate(now)
                                .build())
                        .challenge(sysChallenge)
                        .progress(0)
                        .targetAmount(sysChallenge.getTargetAmount())
                        .isCompleted(false)
                        .status(ChallengeStatus.IN_PROGRESS)
                        .expReward(sysChallenge.getBaseExp())
                        .rewardCoins(sysChallenge.getRewardCoins())
                        .build();
                result.add(virtualRecord);
            }
        }

        return result.stream()
                .sorted(Comparator.comparingInt((UserDailyChallenge c) -> {
                    if (c.getStatus() == ChallengeStatus.CAN_CLAIM) return 1;
                    if (c.getStatus() == ChallengeStatus.IN_PROGRESS) return 2;
                    if (c.getStatus() == ChallengeStatus.CLAIMED) return 3;
                    return 4;
                }))
                .collect(Collectors.toList());
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
}