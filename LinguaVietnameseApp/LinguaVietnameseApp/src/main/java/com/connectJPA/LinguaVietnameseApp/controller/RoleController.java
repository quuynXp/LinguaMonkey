package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.RoleRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.RoleResponse;
import com.connectJPA.LinguaVietnameseApp.enums.RoleName;
import com.connectJPA.LinguaVietnameseApp.service.RoleService;
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
@RequestMapping("/api/v1/roles")
@RequiredArgsConstructor
public class RoleController {
    private final RoleService roleService;
    private final MessageSource messageSource;

    @Operation(summary = "Get all roles", description = "Retrieve a paginated list of roles with optional filtering by roleName")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved roles"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters")
    })
    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public AppApiResponse<Page<RoleResponse>> getAllRoles(
            @Parameter(description = "Role name filter") @RequestParam(required = false) RoleName roleName,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        Page<RoleResponse> roles = roleService.getAllRoles(roleName, pageable);
        return AppApiResponse.<Page<RoleResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("role.list.success", null, locale))
                .result(roles)
                .build();
    }

    @Operation(summary = "Get role by ID", description = "Retrieve a role by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved role"),
            @ApiResponse(responseCode = "404", description = "Role not found")
    })
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public AppApiResponse<RoleResponse> getRoleById(
            @Parameter(description = "Role ID") @PathVariable UUID id,
            Locale locale) {
        RoleResponse role = roleService.getRoleById(id);
        return AppApiResponse.<RoleResponse>builder()
                .code(200)
                .message(messageSource.getMessage("role.get.success", null, locale))
                .result(role)
                .build();
    }

    @Operation(summary = "Create a new role", description = "Create a new role with the provided details")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Role created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid role data")
    })
    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public AppApiResponse<RoleResponse> createRole(
            @Valid @RequestBody RoleRequest request,
            Locale locale) {
        RoleResponse role = roleService.createRole(request);
        return AppApiResponse.<RoleResponse>builder()
                .code(201)
                .message(messageSource.getMessage("role.created.success", null, locale))
                .result(role)
                .build();
    }

    @Operation(summary = "Update a role", description = "Update an existing role by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Role updated successfully"),
            @ApiResponse(responseCode = "404", description = "Role not found"),
            @ApiResponse(responseCode = "400", description = "Invalid role data")
    })
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public AppApiResponse<RoleResponse> updateRole(
            @Parameter(description = "Role ID") @PathVariable UUID id,
            @Valid @RequestBody RoleRequest request,
            Locale locale) {
        RoleResponse role = roleService.updateRole(id, request);
        return AppApiResponse.<RoleResponse>builder()
                .code(200)
                .message(messageSource.getMessage("role.updated.success", null, locale))
                .result(role)
                .build();
    }

    @Operation(summary = "Delete a role", description = "Delete a role by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Role deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Role not found")
    })
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public AppApiResponse<Void> deleteRole(
            @Parameter(description = "Role ID") @PathVariable UUID id,
            Locale locale) {
        roleService.deleteRole(id);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("role.deleted.success", null, locale))
                .build();
    }

    @Operation(summary = "Assign default student role to a user")
    @PostMapping("/assign-default/{userId}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public AppApiResponse<Void> assignDefaultStudentRole(
            @PathVariable UUID userId,
            Locale locale) {
        roleService.assignDefaultStudentRole(userId);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("role.assign.student.success", null, locale))
                .build();
    }

    @Operation(summary = "Assign a role to a user")
    @PostMapping("/assign/{userId}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public AppApiResponse<Void> assignRoleToUser(
            @PathVariable UUID userId,
            @RequestParam RoleName roleName,
            Locale locale) {
        roleService.assignRoleToUser(userId, roleName);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("role.assign.success", null, locale))
                .build();
    }

    @Operation(summary = "Remove a role from a user")
    @DeleteMapping("/remove/{userId}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public AppApiResponse<Void> removeRoleFromUser(
            @PathVariable UUID userId,
            @RequestParam RoleName roleName,
            Locale locale) {
        roleService.removeRoleFromUser(userId, roleName);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("role.remove.success", null, locale))
                .build();
    }

    @Operation(summary = "Check if user has a specific role")
    @GetMapping("/has-role/{userId}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public AppApiResponse<Boolean> userHasRole(
            @PathVariable UUID userId,
            @RequestParam RoleName roleName,
            Locale locale) {
        boolean hasRole = roleService.userHasRole(userId, roleName);
        return AppApiResponse.<Boolean>builder()
                .code(200)
                .message(messageSource.getMessage("role.check.success", null, locale))
                .result(hasRole)
                .build();
    }

}