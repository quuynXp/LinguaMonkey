package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserSeriesProgressId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;

@Data
@Entity
@Table(name = "user_series_progress")
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class UserSeriesProgress extends BaseEntity {
    @EmbeddedId
    private UserSeriesProgressId id;

    @Column(name = "current_index", nullable = false)
    private int currentIndex;

    @Column(name = "started_at", nullable = false)
    private OffsetDateTime startedAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;
}

