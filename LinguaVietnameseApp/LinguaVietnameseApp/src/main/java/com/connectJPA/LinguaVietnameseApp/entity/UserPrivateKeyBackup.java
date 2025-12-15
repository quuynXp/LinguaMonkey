package com.connectJPA.LinguaVietnameseApp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Data
@Table(name = "user_private_key_backups")
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserPrivateKeyBackup {
    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "encrypted_identity_private_key", nullable = false, columnDefinition = "TEXT")
    private String encryptedIdentityPrivateKey;

    @Column(name = "encrypted_signing_private_key", nullable = false, columnDefinition = "TEXT")
    private String encryptedSigningPrivateKey;

    @Column(name = "encrypted_signed_pre_key_private", nullable = false, columnDefinition = "TEXT")
    private String encryptedSignedPreKeyPrivate;

    @UpdateTimestamp
    @Column(name = "backed_up_at")
    private LocalDateTime backedUpAt;
}