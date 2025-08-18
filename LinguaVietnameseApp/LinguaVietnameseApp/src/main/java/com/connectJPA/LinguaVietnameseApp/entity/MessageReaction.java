package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@SuperBuilder
@Entity
@Table(name = "message_reactions")
@AllArgsConstructor
@NoArgsConstructor
public class MessageReaction extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "reaction_id", updatable = false, nullable = false)
    private UUID reactionId;

    @Column(name = "chat_message_id", nullable = false)
    private UUID chatMessageId;

    @Column(name = "sent_at", nullable = false)
    private OffsetDateTime sentAt;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "reaction", nullable = false, length = 50)
    private String reaction;
}
