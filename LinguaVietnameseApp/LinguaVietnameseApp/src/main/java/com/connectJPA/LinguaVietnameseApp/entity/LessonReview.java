package com.connectJPA.LinguaVietnameseApp.entity;


import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@SuperBuilder
@Entity
@Table(name = "lesson_reviews")
@AllArgsConstructor
@NoArgsConstructor
public class LessonReview extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "review_id", updatable = false, nullable = false)
    private UUID reviewId;

    @Column(name = "lesson_id", nullable = false)
    private UUID lessonId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "rating", nullable = false)
    private BigDecimal rating;

    private boolean verified;

    @Column(name = "language_code")
    private String languageCode;

    @Column(name = "comment")
    private String comment;

    @Column(name = "reviewed_at", nullable = false)
    private OffsetDateTime reviewedAt;
}
