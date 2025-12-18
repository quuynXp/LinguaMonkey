package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.enums.ContentType;
import com.connectJPA.LinguaVietnameseApp.enums.RepeatType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_memorizations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class UserMemorization extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "memorization_id", updatable = false, nullable = false)
    private UUID memorizationId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "content_type", nullable = false)
    private ContentType contentType;

    @Column(name = "content_id")
    private UUID contentId; 

    @Column(name = "note_text", columnDefinition = "text")
    private String noteText; 

    @Column(name = "definition", columnDefinition = "text")
    private String definition;

    @Column(name = "example", columnDefinition = "text")
    private String example;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "audio_url")
    private String audioUrl;

    @Column(name = "is_favorite", nullable = false)
    @Builder.Default
    private boolean isFavorite = false;

    @Column(name = "reminder_enabled")
    private Boolean reminderEnabled;

    @Column(name = "reminder_time")
    private String reminderTime;

    @Enumerated(EnumType.STRING)
    @Column(name = "repeat_type")
    private RepeatType repeatType;

    @Column(name = "reminder_title")
    private String reminderTitle;
    
    @Column(name = "linked_flashcard_id")
    private UUID linkedFlashcardId;
}