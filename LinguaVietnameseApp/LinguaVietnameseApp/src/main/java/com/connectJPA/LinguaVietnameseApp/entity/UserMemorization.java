package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.enums.ContentType;
import com.connectJPA.LinguaVietnameseApp.service.elasticsearch.listener.ElasticsearchEntityListener;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.GenericGenerator;
import org.springframework.data.elasticsearch.annotations.Document;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_memorizations")
@Document(indexName = "user_memorizations")
@Getter
@Setter
@EntityListeners(ElasticsearchEntityListener.class)
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class UserMemorization extends BaseEntity {
    @org.springframework.data.annotation.Id
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
    private UUID contentId; // References event_id, lesson_id, video_id, etc.

    @Column(name = "note_text")
    private String noteText; // Free-form notes, vocabulary, or formulas

    @Column(name = "is_favorite", nullable = false)
    private boolean isFavorite = false;
}
