package com.connectJPA.LinguaVietnameseApp.service;



import com.connectJPA.LinguaVietnameseApp.entity.UserDailyChallenge;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface DailyChallengeService {
    List<UserDailyChallenge> getTodayChallenges(UUID userId);
    UserDailyChallenge assignChallenge(UUID userId);
    void completeChallenge(UUID userId, UUID challengeId);

    Map<String, Object> getDailyChallengeStats(UUID userId);
}

