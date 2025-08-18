package com.connectJPA.LinguaVietnameseApp.entity.id;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Embeddable
@Builder
public class UserBadgeId implements Serializable {
    @Column(name = "badge_id", nullable = false)
    private UUID badgeId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;
}
