package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.PasswordUpdateRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.UserRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.Character3dResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.RegisterResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.UserProfileResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.UserResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.UserStatsResponse;
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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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

    @Operation(summary = "Get all users (Admin Only)", description = "Retrieve a paginated list of raw user entities")
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

    @Operation(summary = "Search public users", description = "Retrieve a list of user profiles for public directory/search. Safe for general users.")
    @GetMapping("/search")
    @PreAuthorize("isAuthenticated()")
    public AppApiResponse<Page<UserProfileResponse>> searchPublicUsers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Country country,
            @Parameter(description = "Pagination") Pageable pageable,
            Principal principal,
            Locale locale) {
        
        UUID viewerId = (principal != null) ? UUID.fromString(principal.getName()) : null;
        Page<UserProfileResponse> users = userService.searchPublicUsers(viewerId, keyword, country, pageable);
        
        return AppApiResponse.<Page<UserProfileResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("user.list.success", null, locale))
                .result(users)
                .build();
    }

    @GetMapping("/count-online")
public AppApiResponse<Long> countOnlineUsers() {
    return AppApiResponse.<Long>builder()
            .code(200)
            .message("Success")
            .result(userService.countOnlineUsers())
            .build();
}

    @Operation(summary = "Get suggested users", description = "Get users with similar profile features")
    @GetMapping("/{userId}/suggestions")
    public AppApiResponse<Page<UserResponse>> getSuggestedUsers(
            @PathVariable UUID userId,
            @Parameter(description = "Pagination") Pageable pageable,
            Locale locale) {
        Page<UserResponse> suggestions = userService.getSuggestedUsers(userId, pageable);
        return AppApiResponse.<Page<UserResponse>>builder()
                .code(200)
                .message("Suggested users retrieved successfully")
                .result(suggestions)
                .build();
    }

    @Operation(summary = "Get user by ID", description = "Retrieve a user by their ID")
    @GetMapping("/{userId}")
    @PreAuthorize("isAuthenticated()")
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

    @PostMapping("/fcm-token")
    @PreAuthorize("isAuthenticated()")
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

    @PostMapping
    @PreAuthorize("permitAll")
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

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or #id.toString() == authentication.name")
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
    @PreAuthorize("permitAll")
    public AppApiResponse<Boolean> checkEmail(@RequestParam String email,  Locale locale) {
        boolean exists = userService.emailExists(email);
        boolean available = !exists;
        String msgKey = available ? "user.email.available" : "user.email.exists";
        return AppApiResponse.<Boolean>builder()
                .code(200)
                .message(messageSource.getMessage(msgKey, null, locale))
                .result(available)
                .build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public AppApiResponse<Void> deleteUser(
            @Parameter(description = "User ID") @PathVariable UUID id,
             Locale locale) {
        userService.deleteUser(id);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("user.deleted.success", null, locale))
                .build();
    }

    @PatchMapping("/{id}/avatar")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or #id.toString() == authentication.name")
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

    @GetMapping("/{userId}/character3d")
    @PreAuthorize("isAuthenticated()")
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
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or #userId.toString() == authentication.name")
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

    @PatchMapping("/{id}/native-language")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or #id.toString() == authentication.name")
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

    @GetMapping("/{id}/stats")
    @PreAuthorize("isAuthenticated()")
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

    @PatchMapping("/{id}/country")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or #id.toString() == authentication.name")
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

    @PatchMapping("/{id}/exp")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or #id.toString() == authentication.name")
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

    @PatchMapping("/{id}/streak")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or #id.toString() == authentication.name")
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

    @PatchMapping("/{id}/setup-status")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or #id.toString() == authentication.name")
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

    @PatchMapping("/{id}/placement-test-status")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or #id.toString() == authentication.name")
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

    @PatchMapping("/{id}/daily-welcome")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or #id.toString() == authentication.name")
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

    @PatchMapping("/{id}/password")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or #id.toString() == authentication.name")
    public AppApiResponse<Void> changePassword(
            @Parameter(description = "User ID") @PathVariable UUID id,
            @Valid @RequestBody PasswordUpdateRequest request,
             Locale locale) {
        userService.changePassword(id, request);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("user.password.updated.success", null, locale))
                .build();
    }

    @DeleteMapping("/{id}/deactivate")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or #id.toString() == authentication.name")
    public AppApiResponse<Void> deactivateAccount(
            @Parameter(description = "User ID") @PathVariable UUID id,
            @Parameter(description = "Days until permanent deletion") @RequestParam(defaultValue = "30") @Min(1) int daysToKeep,
             Locale locale) {
        userService.deactivateUser(id, daysToKeep);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("user.deactivated.success", new Object[]{daysToKeep}, locale))
                .build();
    }

    @PatchMapping("/{id}/restore")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or #id.toString() == authentication.name")
    public AppApiResponse<UserResponse> restoreAccount(
            @Parameter(description = "User ID") @PathVariable UUID id,
             Locale locale) {
        UserResponse user = userService.restoreUser(id);
        return AppApiResponse.<UserResponse>builder()
                .code(200)
                .message(messageSource.getMessage("user.restored.success", null, locale))
                .result(user)
                .build();
    }
}