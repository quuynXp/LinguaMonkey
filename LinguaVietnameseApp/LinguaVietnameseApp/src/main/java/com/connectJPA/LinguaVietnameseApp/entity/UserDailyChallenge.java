package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserDailyChallengeId;
import com.connectJPA.LinguaVietnameseApp.enums.ChallengeStatus;
import com.connectJPA.LinguaVietnameseApp.enums.ChallengePeriod;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;

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

    @Column(name = "target_amount")
    private int targetAmount;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId")
    @JoinColumn(name = "user_id")
    @JsonIgnore
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("challengeId")
    @JoinColumn(name = "challenge_id")
    private DailyChallenge challenge;

    @Column(name = "progress")
    private int progress;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private ChallengeStatus status; 

    private boolean isCompleted;

    @Column(name = "assigned_at")
    @CreationTimestamp
    private OffsetDateTime assignedAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @Column(name = "claimed_at")
    private OffsetDateTime claimedAt;

    @Column(name = "exp_reward")
    private int expReward;

    @Column(name = "reward_coins")
    private int rewardCoins;

    @Transient
    @JsonProperty("completed")
    public boolean getCompleted() {
        return this.status == ChallengeStatus.CAN_CLAIM || this.status == ChallengeStatus.CLAIMED;
    }

    @JsonProperty("title")
    public String getTitle() {
        return challenge != null ? challenge.getTitle() : null;
    }

    @JsonProperty("description")
    public String getDescription() {
        return challenge != null ? challenge.getDescription() : null;
    }
    
    @JsonProperty("period")
    public ChallengePeriod getPeriod() {
        return challenge != null ? challenge.getPeriod() : null;
    }

    @JsonProperty("screenRoute")
    public String getScreenRoute() {
        return challenge != null ? challenge.getScreenRoute() : null;
    }

    @JsonProperty("stack")
    public String getStack() {
        return challenge != null ? challenge.getStack() : null;
    }

    @JsonProperty("userId")
    public UUID getUserId() {
        return id != null ? id.getUserId() : null;
    }

    @JsonProperty("challengeId")
    public UUID getChallengeId() {
        return id != null ? id.getChallengeId() : null;
    }

    @JsonProperty("dailyChallenge")
    @JsonIgnore
    public DailyChallenge getDailyChallenge() {
        return challenge;
    }
}