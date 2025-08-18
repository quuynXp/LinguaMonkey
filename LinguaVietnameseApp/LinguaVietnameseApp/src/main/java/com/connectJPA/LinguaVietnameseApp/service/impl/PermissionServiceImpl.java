package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.PermissionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.PermissionResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Permission;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
import com.connectJPA.LinguaVietnameseApp.mapper.PermissionMapper;
import com.connectJPA.LinguaVietnameseApp.repository.PermissionRepository;
import com.connectJPA.LinguaVietnameseApp.service.PermissionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
public class PermissionServiceImpl implements PermissionService {
    private final PermissionRepository permissionRepository;
    private final PermissionMapper permissionMapper;

    @Override
    @Cacheable(value = "permissions", key = "#name + ':' + #pageable.pageNumber + ':' + #pageable.pageSize")
    public Page<PermissionResponse> getAllPermissions(String name, Pageable pageable) {
        try {
            if (pageable == null) {
                throw new AppException(ErrorCode.INVALID_PAGEABLE);
            }
            Page<Permission> permissions = permissionRepository.findByNameContainingAndIsDeletedFalse(name, pageable);
            return permissions.map(permissionMapper::toResponse);
        } catch (Exception e) {
            log.error("Error while fetching all permissions: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Cacheable(value = "permissions", key = "#id")
    public PermissionResponse getPermissionById(UUID id) {
        try {
            if (id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            Permission permission = permissionRepository.findByPermissionIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.PERMISSION_NOT_FOUND));
            return permissionMapper.toResponse(permission);
        } catch (Exception e) {
            log.error("Error while fetching permission by ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CachePut(value = "permissions", key = "#result.permissionId")
    public PermissionResponse createPermission(PermissionRequest request) {
        try {
            if (request == null) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            Permission permission = permissionMapper.toEntity(request);
            permission = permissionRepository.save(permission);
            return permissionMapper.toResponse(permission);
        } catch (Exception e) {
            log.error("Error while creating permission: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CachePut(value = "permissions", key = "#id")
    public PermissionResponse updatePermission(UUID id, PermissionRequest request) {
        try {
            if (id == null || request == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            Permission permission = permissionRepository.findByPermissionIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.PERMISSION_NOT_FOUND));
            permissionMapper.updateEntityFromRequest(request, permission);
            permission = permissionRepository.save(permission);
            return permissionMapper.toResponse(permission);
        } catch (Exception e) {
            log.error("Error while updating permission ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = "permissions", key = "#id")
    public void deletePermission(UUID id) {
        try {
            if (id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            Permission permission = permissionRepository.findByPermissionIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.PERMISSION_NOT_FOUND));
            permissionRepository.deleteById(id); // Hard delete for permissions
        } catch (Exception e) {
            log.error("Error while deleting permission ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }
}