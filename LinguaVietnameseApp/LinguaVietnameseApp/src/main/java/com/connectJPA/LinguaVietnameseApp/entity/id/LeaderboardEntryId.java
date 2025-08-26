package com.connectJPA.LinguaVietnameseApp.entity.id;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LeaderboardEntryId implements Serializable {
    @Column(name = "leaderboard_id")
    private UUID leaderboardId;

    @Column(name = "user_id")
    private UUID userId;
}