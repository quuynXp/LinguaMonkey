package com.connectJPA.LinguaVietnameseApp.service;



import com.connectJPA.LinguaVietnameseApp.dto.response.DailyChallengeUpdateResponse;
import com.connectJPA.LinguaVietnameseApp.entity.UserDailyChallenge;
import com.connectJPA.LinguaVietnameseApp.enums.ChallengeType;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface DailyChallengeService {
    List<UserDailyChallenge> getTodayChallenges(UUID userId);
    UserDailyChallenge assignChallenge(UUID userId);
    void completeChallenge(UUID userId, UUID challengeId);
    DailyChallengeUpdateResponse updateChallengeProgress(UUID userId, ChallengeType challengeType, int increment);
    Map<String, Object> getDailyChallengeStats(UUID userId);
    void claimReward(UUID userId, UUID challengeId);

    void assignAllChallengesToNewUser(UUID userId);
}

