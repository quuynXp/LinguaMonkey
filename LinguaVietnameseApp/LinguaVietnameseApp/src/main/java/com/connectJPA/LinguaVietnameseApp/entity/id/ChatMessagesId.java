package com.connectJPA.LinguaVietnameseApp.entity.id;

import jakarta.annotation.Generated;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;

@Data
@Embeddable
@AllArgsConstructor
@NoArgsConstructor
public class ChatMessagesId implements Serializable {
    // @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "chat_message_id", nullable = false)
    private UUID chatMessageId;

    @CreationTimestamp
    @Column(name = "sentAt", nullable = false)
    private OffsetDateTime sentAt;
}
