package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Entity
@Table(name = "leaderboard_entries")
@Data
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class LeaderboardEntry extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "leaderboard_entry_id")
    private UUID leaderboardEntryId;

    @Column(name = "leaderboard_id")
    private UUID leaderboardId;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "rank", nullable = false)
    private int rank;

    @Column(name = "score", nullable = false)
    private int score;

    @Column(name = "level", nullable = false)
    private int level;

    @Column(name = "streak", nullable = false)
    private int streak;

    @Column(name = "change", nullable = false)
    private int change;
}

