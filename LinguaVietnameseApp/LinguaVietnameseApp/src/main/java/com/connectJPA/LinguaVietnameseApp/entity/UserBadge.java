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

}
