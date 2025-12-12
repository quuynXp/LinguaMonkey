package com.connectJPA.LinguaVietnameseApp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Data
@Table(name = "user_e2e_keys")
@AllArgsConstructor
@NoArgsConstructor
public class UserE2EKey {
    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "identity_public_key", nullable = false, length = 512)
    private String identityPublicKey;

    @Column(name = "signed_prekey_id", nullable = false)
    private int signedPreKeyId;

    @Column(name = "signed_prekey_public_key", nullable = false, length = 512)
    private String signedPreKeyPublicKey;

    @Column(name = "signed_prekey_signature", nullable = false, length = 512)
    private String signedPreKeySignature;

    @Column(name = "last_prekey_bundle_upload")
    private LocalDateTime lastPreKeyBundleUpload;
}