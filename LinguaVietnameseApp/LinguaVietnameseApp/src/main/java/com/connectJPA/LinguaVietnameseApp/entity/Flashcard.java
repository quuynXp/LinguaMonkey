package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "flashcards")
@Data
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class Flashcard extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "flashcard_id")
    private UUID flashcardId;

    @Column(name = "lesson_id", nullable = false)
    private UUID lessonId;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "front", columnDefinition = "text")
    private String front;

    @Column(name = "back", columnDefinition = "text")
    private String back;

    @Column(name = "example_sentence", columnDefinition = "text")
    private String exampleSentence;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "audio_url")
    private String audioUrl;

    @Column(name = "tags")
    private String tags;

    @Column(name = "next_review_at")
    private OffsetDateTime nextReviewAt;

    @Column(name = "last_reviewed_at")
    private OffsetDateTime lastReviewedAt;

    @Column(name = "interval_days")
    private Integer intervalDays;

    @Column(name = "repetitions")
    private Integer repetitions;

    @Column(name = "ease_factor")
    private Float easeFactor;

    @Column(name = "is_suspended")
    private Boolean isSuspended;

    @Column(name = "is_deleted")
    private Boolean isDeleted;
}
