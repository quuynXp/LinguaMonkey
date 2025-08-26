package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.entity.id.LeaderboardEntryId;
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

    @EmbeddedId
    private LeaderboardEntryId leaderboardEntryId;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId")  // map vào field userId trong LeaderboardEntryId
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("leaderboardId")  // map vào field leaderboardId trong LeaderboardEntryId
    @JoinColumn(name = "leaderboard_id")
    private Leaderboard leaderboard;

    @Column(nullable = false)
    private int score;
}


