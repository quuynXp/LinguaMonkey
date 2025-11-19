package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserRoadmapId;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.OffsetDateTime;
import java.util.UUID;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "user_roadmaps")
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class UserRoadmap extends BaseEntity {
    @EmbeddedId
    private UserRoadmapId userRoadmapId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "roadmap_id", insertable = false, updatable = false)
    private Roadmap roadmap;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;

    @Column(name = "current_level")
    private Integer currentLevel;

    @Column(name = "target_level")
    private Integer targetLevel;

    @Column(name = "target_proficiency")
    private String targetProficiency;

    @Column(name = "estimated_completion_time")
    private Integer estimatedCompletionTime;

    @Column(name = "completed_items")
    private Integer completedItems;

    @Column(name = "status")
    private String status;

    @Column(name = "is_public", nullable = false)
    private Boolean isPublic;

    @Column(name = "language")
    private String language;
}

