package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.RoleRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.RoleResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Role;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.entity.UserRole;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserRoleId;
import com.connectJPA.LinguaVietnameseApp.enums.RoleName;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
import com.connectJPA.LinguaVietnameseApp.mapper.RoleMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.RoleRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRoleRepository;
import com.connectJPA.LinguaVietnameseApp.service.RoleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class RoleServiceImpl implements RoleService {
    private final RoleRepository roleRepository;
    private final RoleMapper roleMapper;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private UserRoleRepository userRoleRepository;

    @Override
    @Cacheable(value = "roles", key = "#roleName + ':' + #pageable.pageNumber + ':' + #pageable.pageSize")
    public Page<RoleResponse> getAllRoles(RoleName roleName, Pageable pageable) {
        try {
            if (pageable == null) {
                throw new AppException(ErrorCode.INVALID_PAGEABLE);
            }
            Page<Role> roles = roleRepository.findByRoleNameContainingAndIsDeletedFalse(roleName, pageable);
            return roles.map(roleMapper::toResponse);
        } catch (Exception e) {
            log.error("Error while fetching all roles: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Cacheable(value = "roles", key = "#id")
    public RoleResponse getRoleById(UUID id) {
        try {
            if (id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            Role role = roleRepository.findByRoleIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));
            return roleMapper.toResponse(role);
        } catch (Exception e) {
            log.error("Error while fetching role by ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CachePut(value = "roles", key = "#result.roleId")
    public RoleResponse createRole(RoleRequest request) {
        try {
            if (request == null || request.getName() == null) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            Role role = roleMapper.toEntity(request);
            role = roleRepository.save(role);
            return roleMapper.toResponse(role);
        } catch (Exception e) {
            log.error("Error while creating role: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CachePut(value = "roles", key = "#id")
    public RoleResponse updateRole(UUID id, RoleRequest request) {
        try {
            if (id == null || request == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            Role role = roleRepository.findByRoleIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));
            roleMapper.updateEntityFromRequest(request, role);
            role = roleRepository.save(role);
            return roleMapper.toResponse(role);
        } catch (Exception e) {
            log.error("Error while updating role ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = "roles", key = "#id")
    public void deleteRole(UUID id) {
        try {
            if (id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            Role role = roleRepository.findByRoleIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));
            roleRepository.softDeleteById(id);
        } catch (Exception e) {
            log.error("Error while deleting role ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public void assignDefaultStudentRole(UUID userId) {
        assignRoleToUser(userId, RoleName.STUDENT);
    }

    @Override
    @Transactional
    public void assignRoleToUser(UUID userId, RoleName roleName) {
        // 1) Lấy user từ DB
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // 2) Lấy role từ DB theo roleName
        Role role = roleRepository.findByRoleNameAndIsDeletedFalse(roleName)
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));
        System.out.println("Role id:" + role.getRoleId() + " ROle name: "+ role.getRoleName());

        // 3) Kiểm tra role đã tồn tại trong DB chưa (dù fetch đã có, để chắc chắn)
        if (role.getRoleId() == null) {
            // Nếu role chưa persist, force persist và flush để UUID tồn tại trong DB
            role = roleRepository.saveAndFlush(role);
            log.warn("Role was not persisted yet, forced saveAndFlush. New roleId={}", role.getRoleId());
        }

        // 4) Kiểm tra user đã có role này chưa
        boolean exists = userRoleRepository.existsByIdUserIdAndIdRoleId(userId, role.getRoleId());
        log.debug("Assigning role id={} name={} to userId={}", role.getRoleId(), role.getRoleName(), userId);

        // 5) Lưu vào user_roles nếu chưa tồn tại
        if (!exists) {
            UserRole userRole = UserRole.builder()
                    .id(new UserRoleId(userId, role.getRoleId()))
                    .user(user)
                    .role(role)
                    .build();
            userRoleRepository.save(userRole);
            log.debug("Assigned role successfully.");
        }
    }




    @Override
    @Transactional
    public void removeRoleFromUser(UUID userId, RoleName roleName) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Role role = roleRepository.findByRoleNameAndIsDeletedFalse(roleName)
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));

        userRoleRepository.deleteByIdUserIdAndIdRoleId(user.getUserId(), role.getRoleId());
    }


    @Override
    public boolean userHasRole(UUID userId, RoleName roleName) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Role role = roleRepository.findByRoleNameAndIsDeletedFalse(roleName)
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));

        return userRoleRepository.existsByIdUserIdAndIdRoleId(user.getUserId(), role.getRoleId());
    }

}