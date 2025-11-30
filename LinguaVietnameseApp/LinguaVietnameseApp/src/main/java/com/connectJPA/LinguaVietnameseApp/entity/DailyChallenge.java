package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.enums.ChallengePeriod;
import com.connectJPA.LinguaVietnameseApp.enums.ChallengeType;
import com.connectJPA.LinguaVietnameseApp.enums.DifficultyLevel;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Entity
@Table(name = "daily_challenges")
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class DailyChallenge extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String title;
    private String description;
    
    @Column(name = "base_exp")
    private int baseExp;

    @Column(name = "target_amount")
    private int targetAmount; // Số lượng cần đạt (ví dụ: 15 phút, 2 bài học)

    @Column(name = "reward_coins")
    private int rewardCoins;

    @Column(name = "language_code")
    private String languageCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "challenge_type")
    private ChallengeType challengeType;

    @Enumerated(EnumType.STRING)
    private DifficultyLevel difficulty;

    @Enumerated(EnumType.STRING)
    @Column(name = "period")
    private ChallengePeriod period; // DAILY or WEEKLY

    @Column(name = "screen_route")
    private String screenRoute; // Tên màn hình để navigate (VD: "LearnScreen")
}