package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.UserRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.*;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.enums.Country;
import com.connectJPA.LinguaVietnameseApp.service.AuthenticationService;
import com.connectJPA.LinguaVietnameseApp.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;
    private final MessageSource messageSource;
    private final AuthenticationService authenticationService;

    @Operation(summary = "Get all users", description = "Retrieve a paginated list of users with optional filtering by email, fullname, or nickname")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved users"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public AppApiResponse<Page<UserResponse>> getAllUsers(
            @Parameter(description = "Email filter") @RequestParam(required = false) String email,
            @Parameter(description = "Fullname filter") @RequestParam(required = false) String fullname,
            @Parameter(description = "Nickname filter") @RequestParam(required = false) String nickname,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        Page<UserResponse> users = userService.getAllUsers(email, fullname, nickname, pageable);
        return AppApiResponse.<Page<UserResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("user.list.success", null, locale))
                .result(users)
                .build();
    }

    @Operation(summary = "Get user by ID", description = "Retrieve a user by their ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved user"),
            @ApiResponse(responseCode = "404", description = "User not found"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or T(java.util.UUID).fromString(authentication.name).equals(#userId)")
    public AppApiResponse<UserResponse> getUserById(
            @Parameter(description = "User ID") @PathVariable UUID id,
            Locale locale) {
        UserResponse user = userService.getUserById(id);
        return AppApiResponse.<UserResponse>builder()
                .code(200)
                .message(messageSource.getMessage("user.get.success", null, locale))
                .result(user)
                .build();
    }

    @Operation(summary = "Create a new user", description = "Create a new user with the provided details")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "User created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid user data"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PostMapping
    public AppApiResponse<RegisterResponse> createUser(
            @RequestBody UserRequest request,
            Locale locale) {
        UserResponse userResponse = userService.createUser(request);

        User user = userService.findByUserId(userResponse.getUserId());

        String accessToken = authenticationService.generateToken(user);
        String refreshToken = authenticationService.generateRefreshToken(user , 360);

        RegisterResponse registerResponse = RegisterResponse.builder()
                .user(userResponse)
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .build();

        return AppApiResponse.<RegisterResponse>builder()
                .code(201)
                .message(messageSource.getMessage("user.created.success", null, locale))
                .result(registerResponse)
                .build();
    }

    @Operation(summary = "Update a user", description = "Update an existing user by their ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User updated successfully"),
            @ApiResponse(responseCode = "404", description = "User not found"),
            @ApiResponse(responseCode = "400", description = "Invalid user data"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or T(java.util.UUID).fromString(authentication.name).equals(#userId)")
    public AppApiResponse<UserResponse> updateUser(
            @Parameter(description = "User ID") @PathVariable UUID id,
            @RequestBody UserRequest request,
            Locale locale) {
        UserResponse user = userService.updateUser(id, request);
        return AppApiResponse.<UserResponse>builder()
                .code(200)
                .message(messageSource.getMessage("user.updated.success", null, locale))
                .result(user)
                .build();
    }

    @Operation(summary = "Delete a user", description = "Soft delete a user by their ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User deleted successfully"),
            @ApiResponse(responseCode = "404", description = "User not found"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or T(java.util.UUID).fromString(authentication.name).equals(#userId)")
    public AppApiResponse<Void> deleteUser(
            @Parameter(description = "User ID") @PathVariable UUID id,
            Locale locale) {
        userService.deleteUser(id);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("user.deleted.success", null, locale))
                .build();
    }

    @Operation(summary = "Update user avatar URL", description = "Update the avatar URL for a user")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Avatar URL updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid URL or user ID"),
            @ApiResponse(responseCode = "404", description = "User not found"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PatchMapping("/{id}/avatar")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or T(java.util.UUID).fromString(authentication.name).equals(#userId)")
    public AppApiResponse<UserResponse> updateAvatarUrl(
            @Parameter(description = "User ID") @PathVariable UUID id,
            @Parameter(description = "Avatar URL") @RequestParam String avatarUrl,
            Locale locale) {
        UserResponse user = userService.updateAvatarUrl(id, avatarUrl);
        return AppApiResponse.<UserResponse>builder()
                .code(200)
                .message(messageSource.getMessage("user.avatar.updated.success", null, locale))
                .result(user)
                .build();
    }

    @Operation(summary = "Get 3D character by UserID", description = "Retrieve a 3D character by its UserID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved 3D character"),
            @ApiResponse(responseCode = "404", description = "3D character not found")
    })
    @GetMapping("/{userId}/character3d")
    public AppApiResponse<Character3dResponse> getCharacter3dByUserId(
            @Parameter(description = "Character3d ID") @PathVariable UUID userId,
            Locale locale) {
        Character3dResponse character = userService.getCharacter3dByUserId(userId);
        return AppApiResponse.<Character3dResponse>builder()
                .code(200)
                .message(messageSource.getMessage("character3d.get.success", null, locale))
                .result(character)
                .build();
    }

    @PatchMapping("/{userId}/last-active")
    public ResponseEntity<AppApiResponse<Void>> updateLastActive(
            @PathVariable UUID userId,
            Principal principal,
            Locale locale) {

        if (principal == null || !principal.getName().equals(userId.toString())) {
            AppApiResponse<Void> res = AppApiResponse.<Void>builder()
                    .code(403)
                    .message(messageSource.getMessage("user.update.lastActive.unauthorized", null, locale))
                    .build();
            return ResponseEntity.status(403).body(res);
        }

        userService.updateLastActive(userId);

        AppApiResponse<Void> res = AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("user.update.lastActive.success", null, locale))
                .build();
        return ResponseEntity.ok(res);
    }

    @Operation(summary = "Update user native language", description = "Update the native language code for a user")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Native language updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid language code or user ID"),
            @ApiResponse(responseCode = "404", description = "User or language not found"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PatchMapping("/{id}/native-language")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or T(java.util.UUID).fromString(authentication.name).equals(#userId)")
    public AppApiResponse<UserResponse> updateNativeLanguage(
            @Parameter(description = "User ID") @PathVariable UUID id,
            @Parameter(description = "Native language code") @RequestParam String nativeLanguageCode,
            Locale locale) {
        UserResponse user = userService.updateNativeLanguage(id, nativeLanguageCode);
        return AppApiResponse.<UserResponse>builder()
                .code(200)
                .message(messageSource.getMessage("user.native_language.updated.success", null, locale))
                .result(user)
                .build();
    }

    @PatchMapping("/{id}/last-active")
    public AppApiResponse<Void> updateLastActive(
            @PathVariable UUID id,
            Locale locale) {
        userService.updateLastActive(id);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("user.last_active.updated", null, locale))
                .build();
    }

    @Operation(summary = "Get user stats (derived from existing tables)")
    @GetMapping("/{id}/stats")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or T(java.util.UUID).fromString(authentication.name).equals(#userId)")
    public AppApiResponse<UserStatsResponse> getUserStats(
            @PathVariable UUID id,
            Locale locale) {
        UserStatsResponse stats = userService.getUserStats(id);
        return AppApiResponse.<UserStatsResponse>builder()
                .code(200)
                .message(messageSource.getMessage("user.stats.success", null, locale))
                .result(stats)
                .build();
    }

    @Operation(summary = "Update user country", description = "Update the country for a user")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Country updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid country or user ID"),
            @ApiResponse(responseCode = "404", description = "User not found"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PatchMapping("/{id}/country")
    @PreAuthorize("hasRole('ADMIN') or T(java.util.UUID).fromString(authentication.name).equals(#id)")
    public AppApiResponse<UserResponse> updateCountry(
            @Parameter(description = "User ID") @PathVariable UUID id,
            @Parameter(description = "Country") @RequestParam Country country,
            Locale locale) {
        UserResponse user = userService.updateCountry(id, country);
        return AppApiResponse.<UserResponse>builder()
                .code(200)
                .message(messageSource.getMessage("user.country.updated.success", null, locale))
                .result(user)
                .build();
    }

    @Operation(summary = "Update user experience points", description = "Add experience points for a user from lessons or events")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Experience points updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid exp or user ID"),
            @ApiResponse(responseCode = "404", description = "User not found"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PatchMapping("/{id}/exp")
    public AppApiResponse<UserResponse> updateExp(
            @Parameter(description = "User ID") @PathVariable UUID id,
            @Parameter(description = "Experience points to add") @RequestParam @Min(value = 0, message = "Exp must be non-negative") int exp,
            Locale locale) {
        UserResponse user = userService.updateExp(id, exp);
        return AppApiResponse.<UserResponse>builder()
                .code(200)
                .message(messageSource.getMessage("user.exp.updated.success", null, locale))
                .result(user)
                .build();
    }

    @Operation(summary = "Update user streak on activity", description = "Increment streak when a user completes a lesson or activity")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Streak updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid user ID"),
            @ApiResponse(responseCode = "404", description = "User not found"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @PatchMapping("/{id}/streak")
    public AppApiResponse<UserResponse> updateStreakOnActivity(
            @Parameter(description = "User ID") @PathVariable UUID id,
            Locale locale) {
        UserResponse user = userService.updateStreakOnActivity(id);
        return AppApiResponse.<UserResponse>builder()
                .code(200)
                .message(messageSource.getMessage("user.streak.updated.success", null, locale))
                .result(user)
                .build();
    }

    @Operation(summary = "Get user level info", description = "Retrieve current level, exp, and exp required for next level")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Level info retrieved successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid user ID"),
            @ApiResponse(responseCode = "404", description = "User not found"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @GetMapping("/{id}/level-info")
    public AppApiResponse<LevelInfoResponse> getLevelInfo(
            @Parameter(description = "User ID") @PathVariable UUID id,
            Locale locale) {
        LevelInfoResponse levelInfo = userService.getLevelInfo(id);
        return AppApiResponse.<LevelInfoResponse>builder()
                .code(200)
                .message(messageSource.getMessage("user.level_info.success", null, locale))
                .result(levelInfo)
                .build();
    }
}