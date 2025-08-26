package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserRoleId;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_roles")
@Data
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class UserRole extends BaseEntity {
    @EmbeddedId
    private UserRoleId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId")
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("roleId")
    @JoinColumn(name = "role_id")
    private Role role;
}
