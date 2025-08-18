package com.connectJPA.LinguaVietnameseApp.configuration;

import com.connectJPA.LinguaVietnameseApp.entity.*;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserRoleId;
import com.connectJPA.LinguaVietnameseApp.enums.AuthProvider;
import com.connectJPA.LinguaVietnameseApp.enums.PermissionName;
import com.connectJPA.LinguaVietnameseApp.enums.RoleName;
import com.connectJPA.LinguaVietnameseApp.repository.*;
import jakarta.transaction.Transactional;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.*;

@Configuration
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ApplicationInitConfig {

    @Lazy PasswordEncoder passwordEncoder;

    DefaultRolePermissions defaultRolePermissions;
    RoleRepository roleRepository;
    UserRepository userRepository;
    UserRoleRepository userRoleRepository;
    PermissionRepository permissionRepository;

    @Bean
    ApplicationRunner applicationRunner() {
        return args -> {
            // 1. Tạo role nếu chưa có
            Role adminRole = getOrCreateRole(RoleName.ADMIN);
            Role studentRole = getOrCreateRole(RoleName.STUDENT);
            Role teacherRole = getOrCreateRole(RoleName.TEACHER);

            // 2. Tạo permission từ enum
            Map<String, UUID> permissionNameToIdMap = new HashMap<>();
            for (PermissionName type : PermissionName.values()) {
                String name = type.name();
                Permission permission = permissionRepository.findByNameAndIsDeletedFalse(name)
                        .orElseGet(() -> permissionRepository.save(
                                Permission.builder()
                                        .name(name)
                                        .description("Auto generated from enum")
                                        .build()
                        ));
                permissionNameToIdMap.put(name, permission.getPermissionId());
            }

            // 3. Gán quyền cho role
            for (Map.Entry<RoleName, Set<PermissionName>> entry : defaultRolePermissions.getAll().entrySet()) {
                Role role = switch (entry.getKey()) {
                    case ADMIN -> adminRole;
                    case TEACHER -> teacherRole;
                    case STUDENT -> studentRole;
                };

                for (PermissionName perm : entry.getValue()) {
                    assignPermissionIfNotExists(role, perm.name());
                }
            }

            // 4. Tạo admin mặc định nếu chưa có
            String adminEmail = "admin@gmail.com";
            if (userRepository.findByEmailAndIsDeletedFalse(adminEmail).isEmpty()) {
                User adminUser = User.builder()
                        .email(adminEmail)
                        .authProvider(AuthProvider.EMAIL)
                        .password(passwordEncoder.encode("admin"))
                        .phone("0373730397")
                        .build();
                adminUser = userRepository.save(adminUser);

                UserRole userRoleBuild = UserRole.builder()
                        .id(new UserRoleId(adminUser.getUserId(), adminRole.getRoleId()))
                        .build();
                userRoleRepository.save(userRoleBuild);

                log.warn("Admin user đã được tạo với password mặc định: admin (hãy đổi mật khẩu)");
            } else {
                log.info("Admin đã tồn tại, không cần tạo lại.");
            }
        };
    }

    private Role getOrCreateRole(RoleName roleName) {
        return roleRepository.findByRoleNameAndIsDeletedFalse(roleName)
                .orElseGet(() -> roleRepository.saveAndFlush(
                        Role.builder()
                                .roleName(roleName)
                                .build()
                ));
    }

    @Transactional
    public void assignPermissionIfNotExists(Role role, String permissionName) {
        Permission permission = permissionRepository.findByNameAndIsDeletedFalse(permissionName)
                .orElseGet(() -> permissionRepository.saveAndFlush(
                        Permission.builder()
                                .name(permissionName)
                                .description("Auto created from enum")
                                .build()
                ));
    }
}