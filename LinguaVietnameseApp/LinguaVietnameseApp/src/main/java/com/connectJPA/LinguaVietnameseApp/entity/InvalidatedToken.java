package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;


import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.UUID;


@Entity
@Table(name = "invalidated_tokens")
@Data
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class InvalidatedToken extends BaseEntity {
    @Id
    @Column(name = "token", nullable = false, unique = true)
    private String token;

    @Column(name = "expiry_time", nullable = false)
    private OffsetDateTime expiryTime;
}

