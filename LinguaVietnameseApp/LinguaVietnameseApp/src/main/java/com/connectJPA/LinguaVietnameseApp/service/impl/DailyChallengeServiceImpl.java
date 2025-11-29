package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.response.DailyChallengeUpdateResponse;
import com.connectJPA.LinguaVietnameseApp.entity.DailyChallenge;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.entity.UserDailyChallenge;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserDailyChallengeId;
import com.connectJPA.LinguaVietnameseApp.enums.ChallengeType;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.DailyChallengeRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserDailyChallengeRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.DailyChallengeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DailyChallengeServiceImpl implements DailyChallengeService {

    private final DailyChallengeRepository dailyChallengeRepository;
    private final UserDailyChallengeRepository userDailyChallengeRepository;
    private final UserRepository userRepository;

    @Override
    public List<UserDailyChallenge> getTodayChallenges(UUID userId) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime startOfDay = now.truncatedTo(ChronoUnit.DAYS);
        OffsetDateTime endOfDay = startOfDay.plusDays(1).minusNanos(1);

        return userDailyChallengeRepository.findChallengesForToday(userId, startOfDay, endOfDay);
    }

    @Override
    @Transactional
    public DailyChallengeUpdateResponse updateChallengeProgress(UUID userId, ChallengeType challengeType, int increment) {
        List<UserDailyChallenge> todayChallenges = getTodayChallenges(userId);

        UserDailyChallenge targetChallenge = todayChallenges.stream()
                .filter(udc -> !udc.isCompleted())
                .filter(udc -> udc.getChallenge() != null && udc.getChallenge().getChallengeType() == challengeType)
                .findFirst()
                .orElse(null);

        if (targetChallenge == null) {
            return null;
        }

        targetChallenge.setProgress(targetChallenge.getProgress() + increment);
        
        int requiredTarget = targetChallenge.getChallenge().getTargetAmount() > 0 
                ? targetChallenge.getChallenge().getTargetAmount() 
                : 1;

        boolean justCompleted = false;

        if (targetChallenge.getProgress() >= requiredTarget) {
            completeChallenge(userId, targetChallenge.getChallengeId());
            justCompleted = true;
            targetChallenge = userDailyChallengeRepository.findById(targetChallenge.getId()).orElse(targetChallenge);
        } else {
            targetChallenge = userDailyChallengeRepository.save(targetChallenge);
        }

        return DailyChallengeUpdateResponse.builder()
                .challengeId(targetChallenge.getChallengeId())
                .title(targetChallenge.getChallenge().getTitle())
                .progress(targetChallenge.getProgress())
                .target(requiredTarget)
                .isCompleted(justCompleted)
                .expReward(targetChallenge.getExpReward())
                .rewardCoins(targetChallenge.getRewardCoins())
                .build();
    }

    @Override
    @Transactional
    public UserDailyChallenge assignChallenge(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<DailyChallenge> allChallenges = dailyChallengeRepository.findByIsDeletedFalse();
        if (allChallenges.isEmpty()) {
            throw new RuntimeException("No challenges available");
        }

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        List<UserDailyChallenge> todayChallenges = getTodayChallenges(userId);
        Set<UUID> assignedChallengeIds = todayChallenges.stream()
                .map(udc -> udc.getId().getChallengeId())
                .collect(Collectors.toSet());
        
        List<DailyChallenge> availableChallenges = allChallenges.stream()
                .filter(ch -> !assignedChallengeIds.contains(ch.getId()))
                .collect(Collectors.toList());
        
        if (availableChallenges.isEmpty()) {
            throw new RuntimeException("All daily challenges already assigned for today");
        }

        DailyChallenge challenge = availableChallenges.get(new Random().nextInt(availableChallenges.size()));

        int stack = todayChallenges.size() + 1;
        int expReward = (int) (challenge.getBaseExp() * (1 + (stack - 1) * 0.2));

        UserDailyChallenge userChallenge = UserDailyChallenge.builder()
                .id(UserDailyChallengeId.builder()
                        .userId(userId)
                        .challengeId(challenge.getId())
                        .assignedDate(now)
                        .stack(stack)
                        .build())
                .user(user)
                .challenge(challenge)
                .isCompleted(false)
                .expReward(expReward)
                .rewardCoins(challenge.getRewardCoins())
                .assignedAt(now) 
                .build();

        return userDailyChallengeRepository.save(userChallenge);
    }

    @Override
    @Transactional
    public void completeChallenge(UUID userId, UUID challengeId) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime startOfDay = now.truncatedTo(ChronoUnit.DAYS);
        OffsetDateTime endOfDay = startOfDay.plusDays(1).minusNanos(1);

        List<UserDailyChallenge> challenges = userDailyChallengeRepository
                .findChallengeForToday(userId, challengeId, startOfDay, endOfDay);

        if (challenges.isEmpty()) return;

        UserDailyChallenge challengeToComplete = challenges.stream()
                .filter(c -> !c.isCompleted())
                .findFirst()
                .orElse(null);

        if (challengeToComplete == null) return;

        challengeToComplete.setCompleted(true);
        challengeToComplete.setCompletedAt(OffsetDateTime.now(ZoneOffset.UTC));
        userDailyChallengeRepository.save(challengeToComplete);

        User user = userRepository.findById(userId).orElseThrow();
        user.setExp(user.getExp() + challengeToComplete.getExpReward());
        user.setCoins(user.getCoins() + challengeToComplete.getRewardCoins()); // Added Coins Logic
        userRepository.save(user);
    }

    @Override
    public Map<String, Object> getDailyChallengeStats(UUID userId) {
        List<UserDailyChallenge> todayChallenges = getTodayChallenges(userId);
        
        long completed = todayChallenges.stream().filter(UserDailyChallenge::isCompleted).count();
        int totalExpReward = todayChallenges.stream().mapToInt(UserDailyChallenge::getExpReward).sum();
        int totalCoins = todayChallenges.stream().mapToInt(UserDailyChallenge::getRewardCoins).sum();

        return Map.of(
                "totalChallenges", (long) todayChallenges.size(),
                "completedChallenges", completed,
                "totalExpReward", totalExpReward,
                "totalCoins", totalCoins,
                "canAssignMore", todayChallenges.size() < 5
        );
    }
}