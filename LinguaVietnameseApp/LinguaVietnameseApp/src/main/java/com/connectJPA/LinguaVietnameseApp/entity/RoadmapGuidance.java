package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Data
@Entity
@Table(name = "roadmap_guidance")
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class RoadmapGuidance extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID guidanceId;

    private UUID itemId;
    private String stage;
    private String title;
    private String description;

    @Column(columnDefinition = "text[]")
    private String[] tips;

    private Integer estimatedTime;
    private Integer orderIndex;
}

