package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserBadgeId;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "user_badges")
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class UserBadge extends BaseEntity {
    @EmbeddedId
    private UserBadgeId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("badgeId") // Ánh xạ tới trường 'badgeId' trong UserBadgeId
    @JoinColumn(name = "badge_id")
    private Badge badge;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId") // Ánh xạ tới trường 'userId' trong UserBadgeId
    @JoinColumn(name = "user_id")
    private User user;
}
