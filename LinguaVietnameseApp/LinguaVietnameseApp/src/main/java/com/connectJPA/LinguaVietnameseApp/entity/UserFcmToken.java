package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "user_fcm_tokens")
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class UserFcmToken extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "user_fcm_token_id")
    private UUID userFcmTokenId;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "fcm_token", nullable = false, unique = true)
    private String fcmToken;
}
