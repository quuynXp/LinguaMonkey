package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "leaderboards")
@Data
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class Leaderboard extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "leaderboard_id")
    private UUID leaderboardId;

    @Column(name = "period")
    private String period;

    @Column(name = "tab")
    private String tab;

    @Column(name = "snapshot_date")
    private OffsetDateTime snapshotDate;
}