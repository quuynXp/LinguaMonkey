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

import java.time.Instant;
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

    // configured rewards / progress
    private int expReward;
    private int rewardCoins;

    // progress and flags
    private Integer progress; // percent 0..100 (nullable)
    private boolean isCompleted;

    // timestamps
    private Instant assignedAt;
    private Instant completedAt;

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
