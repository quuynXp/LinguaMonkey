package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.entity.id.ChatMessagesId;
import com.connectJPA.LinguaVietnameseApp.enums.MessageType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Data
@Table(name = "chat_messages")
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class ChatMessage{
    @EmbeddedId
    private ChatMessagesId id;

    @Column(name = "content")
    private String content;

    @Column(name = "media_url")
    private String mediaUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "message_type")
    private MessageType messageType;

    @Column(name = "room_id", nullable = false)
    private UUID roomId;

    @Column(name = "sender_id", nullable = false)
    private UUID senderId;

    private boolean isDeleted;
    private OffsetDateTime updatedAt;
    private OffsetDateTime deletedAt;

    @Column(name = "is_read", nullable = false)
    private boolean isRead;
}