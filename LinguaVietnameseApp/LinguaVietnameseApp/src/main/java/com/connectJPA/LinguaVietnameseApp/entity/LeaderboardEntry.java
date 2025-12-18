package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.entity.id.LeaderboardEntryId;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "leaderboard_entries")
@Data
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class LeaderboardEntry extends BaseEntity {

    @EmbeddedId
    private LeaderboardEntryId leaderboardEntryId;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId") 
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("leaderboardId") 
    @JoinColumn(name = "leaderboard_id")
    private Leaderboard leaderboard;

    @Column(name = "score", nullable = false)
    private int score;

    @Column(name = "level")
    private int level;

    @Column(name = "exp")
    private int exp;
}