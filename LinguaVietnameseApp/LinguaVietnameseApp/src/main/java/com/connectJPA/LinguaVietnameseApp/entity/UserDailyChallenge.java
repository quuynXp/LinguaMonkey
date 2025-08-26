package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserDailyChallengeId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "user_daily_challenges")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class UserDailyChallenge extends BaseEntity {
    @EmbeddedId
    private UserDailyChallengeId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("challengeId")
    private DailyChallenge challenge;

    private int expReward;
    private boolean isCompleted;
}

