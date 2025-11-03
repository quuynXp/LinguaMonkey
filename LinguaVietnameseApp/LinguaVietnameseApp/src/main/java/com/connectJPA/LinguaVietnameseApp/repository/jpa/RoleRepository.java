package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.Role;
import com.connectJPA.LinguaVietnameseApp.enums.RoleName;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface RoleRepository extends JpaRepository<Role, UUID> {
    @Query("SELECT r FROM Role r WHERE r.roleName LIKE %:roleName% AND r.isDeleted = false")
    Page<Role> findByRoleNameContainingAndIsDeletedFalse(@Param("roleName") RoleName roleName, Pageable pageable);

    @Query("SELECT r FROM Role r WHERE r.roleId = :id AND r.isDeleted = false")
    Optional<Role> findByRoleIdAndIsDeletedFalse(@Param("id") UUID id);

    @Query("UPDATE Role r SET r.isDeleted = true, r.deletedAt = CURRENT_TIMESTAMP WHERE r.roleId = :id AND r.isDeleted = false")
    void softDeleteById(@Param("id") UUID id);

    @Query("SELECT r FROM Role r WHERE r.roleName = :roleName AND r.isDeleted = false")
    Optional<Role> findByRoleNameAndIsDeletedFalse(RoleName roleName);
}