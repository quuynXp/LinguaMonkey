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

    @Enumerated(EnumType.STRING)
    private ActivityType activityType;
}
