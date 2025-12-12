package com.connectJPA.LinguaVietnameseApp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Data
@Table(name = "one_time_prekeys")
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
@IdClass(OneTimePreKey.CompositeId.class)
public class OneTimePreKey {

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Id
    @Column(name = "prekey_id", nullable = false)
    private int preKeyId;

    @Column(name = "public_key", nullable = false, length = 512)
    private String publicKey;

    @Column(name = "uploaded_at", nullable = false)
    private LocalDateTime uploadedAt;

    @Data
    @Embeddable
    @AllArgsConstructor
    @NoArgsConstructor
    public static class CompositeId implements java.io.Serializable {
        private UUID userId;
        private int preKeyId;
    }
}