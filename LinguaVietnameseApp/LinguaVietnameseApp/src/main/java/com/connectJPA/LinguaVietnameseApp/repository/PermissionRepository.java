package com.connectJPA.LinguaVietnameseApp.repository;

import com.connectJPA.LinguaVietnameseApp.entity.Permission;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PermissionRepository extends JpaRepository<Permission, UUID> {
    @Query("SELECT p FROM Permission p WHERE p.name LIKE %:name% AND p.isDeleted = false")
    Page<Permission> findByNameContainingAndIsDeletedFalse(@Param("name") String name, Pageable pageable);

    @Query("SELECT p FROM Permission p WHERE p.permissionId = :id AND p.isDeleted = false")
    Optional<Permission> findByPermissionIdAndIsDeletedFalse(@Param("id") UUID id);

    Optional<Permission> findByNameAndIsDeletedFalse(String name);

    @Query(value = """
    SELECT p.*
    FROM user_roles ur
    JOIN role r ON ur.role_id = r.id
    JOIN role_permission rp ON rp.role_id = r.id
    JOIN permission p ON p.id = rp.permission_id
    WHERE ur.user_id = :userId
""", nativeQuery = true)
    List<Permission> findPermissionsByUserId(@Param("userId") UUID userId);

}