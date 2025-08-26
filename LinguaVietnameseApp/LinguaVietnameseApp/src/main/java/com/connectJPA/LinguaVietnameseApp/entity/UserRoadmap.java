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

    private Integer currentLevel;
    private Integer targetLevel;
    private String targetProficiency;
    private Integer estimatedCompletionTime;
    private String language;
    private Integer completedItems;
    private String status;
}

