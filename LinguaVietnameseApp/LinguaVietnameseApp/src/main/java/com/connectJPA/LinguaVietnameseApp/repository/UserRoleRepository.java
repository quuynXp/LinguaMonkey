package com.connectJPA.LinguaVietnameseApp.repository;

import com.connectJPA.LinguaVietnameseApp.entity.Permission;
import com.connectJPA.LinguaVietnameseApp.entity.Role;
import com.connectJPA.LinguaVietnameseApp.entity.UserRole;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserRoleId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRoleRepository extends JpaRepository<UserRole, UserRoleId> {
    @Query(value = """
SELECT p.*
FROM user_roles ur
JOIN role r ON ur.role_id = r.id
JOIN role_permission rp ON rp.role_id = r.id
JOIN permission p ON p.id = rp.permission_id
WHERE ur.user_id = :userId
""", nativeQuery = true)
    List<Permission> findPermissionsByUserId(@Param("userId") UUID userId);

     void deleteByIdUserIdAndIdRoleId(UUID userId, UUID roleId);

     boolean existsByIdUserIdAndIdRoleId(UUID userId, UUID roleId);

    @Query("SELECT r FROM Role r JOIN UserRole ur ON r.roleId = ur.id.roleId WHERE ur.id.userId = :userId AND r.isDeleted = false")
    List<Role> findRolesByUserId(@Param("userId") UUID userId);




//    @Query(value = """
//    SELECT DISTINCT CONCAT('ROLE_', r.name)
//    FROM user_role ur
//    JOIN role r ON ur.role_id = r.id
//    WHERE ur.user_id = :userId
//""", nativeQuery = true)
//    List<String> findRoleNamesByUserId(@Param("userId") UUID userId);


}

