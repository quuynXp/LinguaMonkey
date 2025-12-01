package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.entity.id.LessonProgressId;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Data
@Table(name = "lesson_progress")
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class LessonProgress extends BaseEntity {
    @EmbeddedId
    private LessonProgressId id;

    @Column(name = "score", nullable = false)
    private float score;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @Column(name = "max_score")
    private Integer maxScore;

    @Column(name = "attempt_number")
    private Integer attemptNumber = 0;

    @Column(name = "needs_review")
    private Boolean needsReview = false;

    @Column(name = "answers_json", columnDefinition = "text")
    private String answersJson;

}