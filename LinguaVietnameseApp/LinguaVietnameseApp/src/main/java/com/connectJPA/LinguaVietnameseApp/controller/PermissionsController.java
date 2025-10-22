package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.PermissionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.PermissionResponse;
import com.connectJPA.LinguaVietnameseApp.service.PermissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/permissions")
@RequiredArgsConstructor
public class PermissionsController {
    private final PermissionService permissionService;
    private final MessageSource messageSource;

    @Operation(summary = "Get all permissions", description = "Retrieve a paginated list of permissions with optional filtering by name")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved permissions"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters")
    })
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping
    public AppApiResponse<Page<PermissionResponse>> getAllPermissions(
            @Parameter(description = "Permission name filter") @RequestParam(required = false) String name,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        Page<PermissionResponse> permissions = permissionService.getAllPermissions(name, pageable);
        return AppApiResponse.<Page<PermissionResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("permission.list.success", null, locale))
                .result(permissions)
                .build();
    }

    @Operation(summary = "Get permission by ID", description = "Retrieve a permission by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved permission"),
            @ApiResponse(responseCode = "404", description = "Permission not found")
    })
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/{id}")
    public AppApiResponse<PermissionResponse> getPermissionById(
            @Parameter(description = "Permission ID") @PathVariable UUID id,
            Locale locale) {
        PermissionResponse permission = permissionService.getPermissionById(id);
        return AppApiResponse.<PermissionResponse>builder()
                .code(200)
                .message(messageSource.getMessage("permission.get.success", null, locale))
                .result(permission)
                .build();
    }

    @Operation(summary = "Create a new permission", description = "Create a new permission with the provided details")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Permission created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid permission data")
    })
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public AppApiResponse<PermissionResponse> createPermission(
            @Valid @RequestBody PermissionRequest request,
            Locale locale) {
        PermissionResponse permission = permissionService.createPermission(request);
        return AppApiResponse.<PermissionResponse>builder()
                .code(201)
                .message(messageSource.getMessage("permission.created.success", null, locale))
                .result(permission)
                .build();
    }

    @Operation(summary = "Update a permission", description = "Update an existing permission by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Permission updated successfully"),
            @ApiResponse(responseCode = "404", description = "Permission not found"),
            @ApiResponse(responseCode = "400", description = "Invalid permission data")
    })
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public AppApiResponse<PermissionResponse> updatePermission(
            @Parameter(description = "Permission ID") @PathVariable UUID id,
            @Valid @RequestBody PermissionRequest request,
            Locale locale) {
        PermissionResponse permission = permissionService.updatePermission(id, request);
        return AppApiResponse.<PermissionResponse>builder()
                .code(200)
                .message(messageSource.getMessage("permission.updated.success", null, locale))
                .result(permission)
                .build();
    }

    @Operation(summary = "Delete a permission", description = "Delete a permission by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Permission deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Permission not found")
    })
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public AppApiResponse<Void> deletePermission(
            @Parameter(description = "Permission ID") @PathVariable UUID id,
            Locale locale) {
        permissionService.deletePermission(id);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("permission.deleted.success", null, locale))
                .build();
    }
}