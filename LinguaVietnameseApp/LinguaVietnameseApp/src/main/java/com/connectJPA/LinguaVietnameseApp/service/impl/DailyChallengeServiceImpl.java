package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.entity.DailyChallenge;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.entity.UserDailyChallenge;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserDailyChallengeId;
import com.connectJPA.LinguaVietnameseApp.repository.DailyChallengeRepository;
import com.connectJPA.LinguaVietnameseApp.repository.UserDailyChallengeRepository;
import com.connectJPA.LinguaVietnameseApp.repository.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.DailyChallengeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
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
        return userDailyChallengeRepository.findByIdUserIdAndIdAssignedDate(userId, OffsetDateTime.now());
    }

    @Override
    @Transactional
    public UserDailyChallenge assignChallenge(UUID userId) {
        List<DailyChallenge> challenges = dailyChallengeRepository.findAll();
        if (challenges.isEmpty()) throw new RuntimeException("No challenges available");

        // random 1 challenge
        DailyChallenge challenge = challenges.get(new Random().nextInt(challenges.size()));

        // lấy stack count = số challenge đã nhận trong ngày
        List<UserDailyChallenge> today = getTodayChallenges(userId);
        int stack = today.size() + 1;

        int expReward = (int) (challenge.getBaseExp() * (1 + (stack - 1) * 0.2));

        UserDailyChallenge userChallenge = UserDailyChallenge.builder()
                .id(UserDailyChallengeId.builder()
                        .userId(userId)
                        .challengeId(challenge.getId())
                        .assignedDate(OffsetDateTime.now())
                        .build())
                .isCompleted(false)
                .expReward(expReward)
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

        UserDailyChallenge challenge = userDailyChallengeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Challenge not found"));

        if (!challenge.isCompleted()) {
            challenge.setCompleted(true);
            userDailyChallengeRepository.save(challenge);

            // update user exp
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            user.setExp(user.getExp() + challenge.getExpReward());
            userRepository.save(user);
        }
    }
}
