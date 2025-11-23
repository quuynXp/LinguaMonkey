package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
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
import jakarta.validation.Valid;
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
@RequestMapping("/api/v1/users")
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
    @GetMapping("/{userId}")
    public AppApiResponse<UserResponse> getUserById(
            @Parameter(description = "User ID") @PathVariable UUID userId,
            Locale locale) {
        UserResponse user = userService.getUserById(userId);
        return AppApiResponse.<UserResponse>builder()
                .code(200)
                .message(messageSource.getMessage("user.get.success", null, locale))
                .result(user)
                .build();
    }

    @PostMapping("/{targetId}/admire")
    @PreAuthorize("isAuthenticated()")
    public AppApiResponse<Void> admireUser(
            @PathVariable UUID targetId,
            Principal principal,
            Locale locale) {

        if (principal == null) {
            return AppApiResponse.<Void>builder()
                    .code(401)
                    .message(messageSource.getMessage("user.unauthenticated", null, locale))
                    .build();
        }

        UUID senderId = UUID.fromString(principal.getName());
        userService.admire(senderId, targetId);

        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("user.admire.success", null, locale))
                .build();
    }

    @Operation(summary = "Register FCM token", description = "Register or update FCM token for push notifications")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Token registered successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid request")
    })
    @PostMapping("/fcm-token")
    public AppApiResponse<Void> registerFcmToken(
            @Valid @RequestBody NotificationRequest request,
            Locale locale) {
        userService.registerFcmToken(request);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("fcm.token.registered", null, locale))
                .build();
    }

    @GetMapping("/{targetId}/profile")
    public AppApiResponse<UserProfileResponse> viewUserProfile(
            @PathVariable UUID targetId,
            Principal principal,
            Locale locale) {
        UUID viewerId = null;
        if (principal != null) {
            viewerId = UUID.fromString(principal.getName());
        }
        UserProfileResponse resp = userService.getUserProfile(viewerId, targetId);
        return AppApiResponse.<UserProfileResponse>builder()
                .code(200)
                .message(messageSource.getMessage("user.profile.get.success", null, locale))
                .result(resp)
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

    @GetMapping("/check-email")
    public AppApiResponse<Boolean> checkEmail(@RequestParam String email, Locale locale) {
        boolean exists = userService.emailExists(email);
        boolean available = !exists;
        String msgKey = available ? "user.email.available" : "user.email.exists";
        return AppApiResponse.<Boolean>builder()
                .code(200)
                .message(messageSource.getMessage(msgKey, null, locale))
                .result(available)
                .build();
    }

    @Operation(summary = "Delete a user", description = "Soft delete a user by their ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User deleted successfully"),
            @ApiResponse(responseCode = "404", description = "User not found"),
            @ApiResponse(responseCode = "403", description = "Access denied")
    })
    @DeleteMapping("/{id}")
    public AppApiResponse<Void> deleteUser(
            @Parameter(description = "User ID") @PathVariable UUID id,
            Locale locale) {
        userService.deleteUser(id);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("user.deleted.success", null, locale))
                .build();
    }

    @Operation(summary = "Update user avatar using temp path",
            description = "Commits a temp file (from /files/upload-temp) as the user's new avatar")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Avatar updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid tempPath or user ID"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    @PatchMapping("/{id}/avatar")
    public AppApiResponse<UserResponse> updateAvatar(
                                                     @Parameter(description = "User ID") @PathVariable UUID id,
                                                     @Parameter(description = "Temporary file path from /files/upload-temp")
                                                     @RequestParam String tempPath,
                                                     Locale locale) {
        UserResponse user = userService.updateUserAvatar(id, tempPath);
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

    @Operation(summary = "Get user stats (derived from existing tables)")
    @GetMapping("/{id}/stats")
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

    @Operation(summary = "Update setup completion status", description = "Mark user as having finished the initial setup")
    @PatchMapping("/{id}/setup-status")
    public AppApiResponse<UserResponse> updateSetupStatus(
            @Parameter(description = "User ID") @PathVariable UUID id,
            @RequestParam boolean isFinished,
            Locale locale) {
        UserResponse user = userService.updateSetupStatus(id, isFinished);
        return AppApiResponse.<UserResponse>builder()
                .code(200)
                .message(messageSource.getMessage("user.setup.updated.success", null, locale))
                .result(user)
                .build();
    }

    @Operation(summary = "Update placement test status", description = "Mark user as having finished the placement test")
    @PatchMapping("/{id}/placement-test-status")
    public AppApiResponse<UserResponse> updatePlacementTestStatus(
            @Parameter(description = "User ID") @PathVariable UUID id,
            @RequestParam boolean isDone,
            Locale locale) {
        UserResponse user = userService.updatePlacementTestStatus(id, isDone);
        return AppApiResponse.<UserResponse>builder()
                .code(200)
                .message(messageSource.getMessage("user.placement_test.updated.success", null, locale))
                .result(user)
                .build();
    }

    @Operation(summary = "Track daily welcome", description = "Update the last daily welcome timestamp to now")
    @PatchMapping("/{id}/daily-welcome")
    public AppApiResponse<UserResponse> trackDailyWelcome(
            @Parameter(description = "User ID") @PathVariable UUID id,
            Locale locale) {
        UserResponse user = userService.trackDailyWelcome(id);
        return AppApiResponse.<UserResponse>builder()
                .code(200)
                .message(messageSource.getMessage("user.daily_welcome.updated.success", null, locale))
                .result(user)
                .build();
    }
}