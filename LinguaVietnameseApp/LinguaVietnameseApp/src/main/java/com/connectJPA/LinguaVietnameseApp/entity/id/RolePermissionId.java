package com.connectJPA.LinguaVietnameseApp.entity.id;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;
import java.util.UUID;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RolePermissionId implements Serializable {

    @Column(name = "permission_id", nullable = false)
    private UUID permissionId;

    @Column(name = "role_id", nullable = false)
    private UUID roleId;
}
