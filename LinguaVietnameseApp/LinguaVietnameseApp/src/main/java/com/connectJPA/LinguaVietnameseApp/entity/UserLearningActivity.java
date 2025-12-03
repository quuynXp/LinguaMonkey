package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.enums.ActivityType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.Type;

import java.time.Duration;
import java.util.UUID;

@Data
@SuperBuilder
@Table(name = "user_learning_activities")
@Entity
@AllArgsConstructor
@NoArgsConstructor
public class UserLearningActivity extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID activityId;

    private UUID userId;

    private UUID targetId;

    @Enumerated(EnumType.STRING)
    private ActivityType activityType;

    @Column(name = "duration_in_seconds")
    private Integer durationInSeconds;

    @Column(name = "details")
    private String details;

    @Column(name = "related_entity_id")
    private UUID relatedEntityId;

    private Integer score;

    private Integer maxScore;

}
