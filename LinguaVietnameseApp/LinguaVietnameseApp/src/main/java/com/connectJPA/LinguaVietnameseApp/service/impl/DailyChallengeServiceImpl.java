package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.entity.DailyChallenge;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.entity.UserDailyChallenge;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserDailyChallengeId;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.DailyChallengeRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserDailyChallengeRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.DailyChallengeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
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
    public UserDailyChallenge assignChallenge(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<DailyChallenge> allChallenges = dailyChallengeRepository.findByIsDeletedFalse();
        if (allChallenges.isEmpty()) {
            throw new RuntimeException("No challenges available");
        }

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        
        // Lấy danh sách thử thách đã gán hôm nay
        List<UserDailyChallenge> todayChallenges = getTodayChallenges(userId);
        
        // Lọc những challenge chưa được gán hôm nay
        Set<UUID> assignedChallengeIds = todayChallenges.stream()
                .map(udc -> udc.getId().getChallengeId())
                .collect(Collectors.toSet());
        
        List<DailyChallenge> availableChallenges = allChallenges.stream()
                .filter(ch -> !assignedChallengeIds.contains(ch.getId()))
                .collect(Collectors.toList());
        
        if (availableChallenges.isEmpty()) {
            // Nếu tất cả challenge đã gán, trả về lỗi hoặc reset
            throw new RuntimeException("All daily challenges already assigned for today");
        }

        // Random 1 challenge từ available
        DailyChallenge challenge = availableChallenges
                .get(new Random().nextInt(availableChallenges.size()));

        int stack = todayChallenges.size() + 1;
        
        // Công thức exp: base * (1 + (stack - 1) * 0.2)
        // Stack 1: base, Stack 2: base * 1.2, Stack 3: base * 1.4...
        int expReward = (int) (challenge.getBaseExp() * (1 + (stack - 1) * 0.2));
        int coinReward = challenge.getRewardCoins();

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
                .rewardCoins(coinReward)
                .assignedAt(now.toInstant())
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

        if (challenges.isEmpty()) {
            throw new RuntimeException("Challenge not found for today");
        }

        UserDailyChallenge challengeToComplete = challenges.stream()
                .filter(c -> !c.isCompleted())
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Challenge already completed or not assigned"));

        // Mark as completed
        challengeToComplete.setCompleted(true);
        challengeToComplete.setCompletedAt(Instant.now());
        userDailyChallengeRepository.save(challengeToComplete);

        // Update user exp
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setExp(user.getExp() + challengeToComplete.getExpReward());
        userRepository.save(user);
    }

    @Override
    public Map<String, Object> getDailyChallengeStats(UUID userId) {
        List<UserDailyChallenge> todayChallenges = getTodayChallenges(userId);
        
        long completed = todayChallenges.stream()
                .filter(UserDailyChallenge::isCompleted)
                .count();
        
        int totalExpReward = todayChallenges.stream()
                .mapToInt(UserDailyChallenge::getExpReward)
                .sum();
        
        int totalCoins = todayChallenges.stream()
                .mapToInt(UserDailyChallenge::getRewardCoins)
                .sum();

        return Map.of(
                "totalChallenges", (long) todayChallenges.size(),
                "completedChallenges", completed,
                "totalExpReward", totalExpReward,
                "totalCoins", totalCoins,
                "canAssignMore", todayChallenges.size() < 5 // Max 5 challenges per day
        );
    }
}