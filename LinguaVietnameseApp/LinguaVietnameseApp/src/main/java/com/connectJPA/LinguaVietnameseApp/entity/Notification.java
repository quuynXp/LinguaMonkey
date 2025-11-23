package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.enums.NotificationType;
// import com.connectJPA.LinguaVietnameseApp.service.elasticsearch.listener.ElasticsearchEntityListener;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.Type;
// import org.springframework.data.elasticsearch.annotations.Document;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "notifications")
// @Document(indexName = "notifications")
@Data
// @EntityListeners(ElasticsearchEntityListener.class)
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class Notification extends BaseEntity {
    @org.springframework.data.annotation.Id
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "notification_id")
    private UUID notificationId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "content")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "type")
    private NotificationType type;

    @Column(name = "language_code")
    private String languageCode;

    private String payload;

    @Column(name = "read", nullable = false)
    private boolean read;

}

