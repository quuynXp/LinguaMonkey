package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.entity.id.RolePermissionId;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;

@Entity
@Table(name = "role_permissions")
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
public class RolePermission extends BaseEntity {

    @EmbeddedId
    private RolePermissionId id;

}
