package com.connectJPA.LinguaVietnameseApp.event;

import com.connectJPA.LinguaVietnameseApp.entity.UserDailyChallenge;
import lombok.Getter;

@Getter
public class DailyChallengeCompletedEvent {

    private final UserDailyChallenge userDailyChallenge;

    public DailyChallengeCompletedEvent(UserDailyChallenge userDailyChallenge) {
        this.userDailyChallenge = userDailyChallenge;
    }
}