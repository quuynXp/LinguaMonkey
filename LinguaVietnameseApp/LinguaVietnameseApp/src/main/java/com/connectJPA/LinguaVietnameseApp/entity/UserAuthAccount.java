package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.enums.AuthProvider;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_auth_accounts",
        uniqueConstraints = @UniqueConstraint(columnNames = {"provider", "provider_user_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserAuthAccount {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false)
    private AuthProvider provider;

    @Column(name = "provider_user_id")
    private String providerUserId;

    @Column(name = "verified", nullable = false)
    private boolean verified = false;

    @Column(name = "is_primary", nullable = false)
    private boolean primaryAccount = false;

    @Column(name = "linked_at")
    private OffsetDateTime linkedAt = OffsetDateTime.now();
}
