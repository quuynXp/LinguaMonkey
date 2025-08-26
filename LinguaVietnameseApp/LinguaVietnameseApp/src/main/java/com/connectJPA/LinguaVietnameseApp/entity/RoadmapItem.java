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
@Table(name = "roadmap_items")
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class RoadmapItem extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID itemId;

    private UUID roadmapId;
    private String title;
    private String description;
    private String type;
    private Integer level;
    private Integer estimatedTime;
    private Integer orderIndex;
    private String category;
    private String difficulty;
    private Integer expReward;
    private UUID contentId;

}

