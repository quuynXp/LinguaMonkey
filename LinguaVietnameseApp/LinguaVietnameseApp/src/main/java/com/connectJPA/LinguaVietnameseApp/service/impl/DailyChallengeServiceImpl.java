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
import java.time.OffsetDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class DailyChallengeServiceImpl implements DailyChallengeService {

    private final DailyChallengeRepository dailyChallengeRepository;
    private final UserDailyChallengeRepository userDailyChallengeRepository;
    private final UserRepository userRepository; // assume bạn có User entity & repo

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
        
        List<DailyChallenge> challenges = dailyChallengeRepository.findAll();
        if (challenges.isEmpty()) throw new RuntimeException("No challenges available");

        // random 1 challenge
        DailyChallenge challenge = challenges.get(new Random().nextInt(challenges.size()));

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        // lấy stack count = số challenge đã nhận trong ngày
        List<UserDailyChallenge> today = getTodayChallenges(userId);
        int stack = today.size() + 1;

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
        UserDailyChallengeId id = UserDailyChallengeId.builder()
                .userId(userId)
                .challengeId(challengeId)
                .assignedDate(OffsetDateTime.now())
                .build();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime startOfDay = now.truncatedTo(ChronoUnit.DAYS);
        OffsetDateTime endOfDay = startOfDay.plusDays(1).minusNanos(1);

        UserDailyChallenge challenge = userDailyChallengeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Challenge not found"));

        List<UserDailyChallenge> challenges = userDailyChallengeRepository.findChallengeForToday(
                userId, challengeId, startOfDay, endOfDay
        );

        if (challenges.isEmpty()) {
            throw new RuntimeException("Challenge not found for today or already completed");
        }

        UserDailyChallenge challengeToComplete = challenges.stream()
                .filter(c -> !c.isCompleted())
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Challenge already completed"));

        if (!challengeToComplete.isCompleted()) {
            challengeToComplete.setCompleted(true);
            challengeToComplete.setCompletedAt(Instant.now());
            userDailyChallengeRepository.save(challengeToComplete);

            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            user.setExp(user.getExp() + challengeToComplete.getExpReward());
            userRepository.save(user);
            }
    }
}
