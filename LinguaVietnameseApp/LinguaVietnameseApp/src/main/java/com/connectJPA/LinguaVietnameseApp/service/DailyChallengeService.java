package com.connectJPA.LinguaVietnameseApp.service;



import com.connectJPA.LinguaVietnameseApp.entity.UserDailyChallenge;

import java.util.List;
import java.util.UUID;

public interface DailyChallengeService {
    List<UserDailyChallenge> getTodayChallenges(UUID userId);
    UserDailyChallenge assignChallenge(UUID userId);
    void completeChallenge(UUID userId, UUID challengeId);
}

