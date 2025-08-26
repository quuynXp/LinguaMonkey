package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
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
@Table(name = "roadmap_milestones")
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class RoadmapMilestone extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID milestoneId;

    private UUID roadmapId;
    private String title;
    private String description;
    private Integer level;

    @Column(columnDefinition = "text[]")
    private String[] requirements;

    @Column(columnDefinition = "text[]")
    private String[] rewards;

    private Integer orderIndex;

}

