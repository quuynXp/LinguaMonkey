package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.enums.Certification;
import com.connectJPA.LinguaVietnameseApp.enums.GoalType;
import com.connectJPA.LinguaVietnameseApp.enums.ProficiencyLevel;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.OffsetDateTime;
import java.util.UUID;

@Table(name = "user_goals")
@Data
@Entity
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class UserGoal extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID goalId;

    private UUID userId;
    private String languageCode;
    @Enumerated(EnumType.STRING)
    private Certification certificate;
    private Integer targetScore;
    private String targetSkill;
    private String customDescription;
    @Enumerated(EnumType.STRING)
    private GoalType goalType;
    @Enumerated(EnumType.STRING)
    private ProficiencyLevel targetProficiency;
    private OffsetDateTime targetDate;
}
