package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserDailyChallengeId;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(name = "user_daily_challenges")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class UserDailyChallenge extends BaseEntity {

    @EmbeddedId
    private UserDailyChallengeId id;

    // don't serialize the full user object to FE
    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId")
    @JoinColumn(name = "user_id")
    @JsonIgnore
    private User user;

    // include challenge details when needed (be careful with lazy-loading)
    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("challengeId")
    @JoinColumn(name = "challenge_id")
    private DailyChallenge challenge;

    private int expReward;
    private int rewardCoins;

    // FIX: Changed from OffsetDateTime to int to match DTO and logic
    private int progress;
    private boolean isCompleted;

    private OffsetDateTime assignedAt;
    private OffsetDateTime completedAt;

    public UserDailyChallenge(UUID userId, UUID id, LocalDate today, int i, int baseExp, boolean b, int rewardCoins, int i1) {
        OffsetDateTime assignedDateTime = (today != null) ? today.atStartOfDay(ZoneOffset.UTC).toOffsetDateTime() : null;

        int stack = i;

        UUID challengeId = id;

        this.id = new UserDailyChallengeId(userId, challengeId, assignedDateTime, stack);

        User u = new User();
        u.setUserId(userId);
        this.user = u;

        DailyChallenge c = new DailyChallenge();
        c.setId(challengeId);
        this.challenge = c;

        this.expReward = baseExp;       // 'baseExp' -> expReward
        this.rewardCoins = rewardCoins;   // 'rewardCoins' -> rewardCoins
        this.progress = i1;             // 'i1' -> progress (int to int)
        this.isCompleted = b;             // 'b' -> isCompleted

        // FIX: Assign OffsetDateTime directly, do not convert toInstant()
        this.assignedAt = assignedDateTime;

        if (this.isCompleted) {
            this.completedAt = OffsetDateTime.now();
        } else {
            this.completedAt = null;
        }
    }

    // convenience JSON props so FE receives simple ids
    @JsonProperty("userId")
    public UUID getUserId() {
        return id != null ? id.getUserId() : null;
    }

    @JsonProperty("challengeId")
    public UUID getChallengeId() {
        return id != null ? id.getChallengeId() : null;
    }

    // optionally expose nested challenge summary to FE
    @JsonProperty("dailyChallenge")
    public DailyChallenge getDailyChallenge() {
        return challenge;
    }
}