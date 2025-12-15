package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.id.ChatMessagesId;
import com.connectJPA.LinguaVietnameseApp.enums.MessageType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Entity
@Data
@Table(name = "chat_messages")
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class ChatMessage {
    @EmbeddedId
    private ChatMessagesId id;

    @Column(name = "content", columnDefinition = "TEXT") // Ciphertext cho Receiver
    private String content;

    @Column(name = "sender_ephemeral_key", length = 512) // Key để Receiver giải mã
    private String senderEphemeralKey;

    @Column(name = "initialization_vector", length = 64) // IV cho Receiver
    private String initializationVector;

    @Column(name = "used_prekey_id") 
    private Integer usedPreKeyId;

    @Column(name = "self_content", columnDefinition = "TEXT") // Ciphertext cho Sender (encrypt bằng key của Sender)
    private String selfContent;

    @Column(name = "self_ephemeral_key", length = 512) // Key để Sender giải mã lại tin của chính mình
    private String selfEphemeralKey;

    @Column(name = "self_initialization_vector", length = 64) // IV cho Sender
    private String selfInitializationVector;

    @Column(name = "media_url")
    private String mediaUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "message_type")
    private MessageType messageType;

    @Column(name = "room_id", nullable = false)
    private UUID roomId;

    @Column(name = "sender_id", nullable = false)
    private UUID senderId;

    @Column(name = "receiver_id")
    private UUID receiverId;

    private boolean isDeleted;

    @UpdateTimestamp
    private OffsetDateTime updatedAt;

    private OffsetDateTime deletedAt;

    @Column(name = "is_read", nullable = false)
    private boolean isRead;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "translations", columnDefinition = "jsonb")
    private Map<String, String> translations;
}