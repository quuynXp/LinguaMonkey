package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.PasswordUpdateRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.UserRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.Character3dResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.LevelInfoResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.UserProfileResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.UserResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.UserStatsResponse;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.enums.AgeRange;
import com.connectJPA.LinguaVietnameseApp.enums.Country;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface UserService {
    Page<UserResponse> getAllUsers(String email, String fullname, String nickname, Pageable pageable);
    
    // NEW: Safe search for public directory
    Page<UserProfileResponse> searchPublicUsers(UUID viewerId, String keyword, Country country, String gender, AgeRange ageRange, Pageable pageable);

    UserResponse getUserById(UUID id);
    UserResponse createUser(UserRequest request);
    UserResponse updateUser(UUID id, UserRequest request);
    void deleteUser(UUID id);
    boolean emailExists(String email);
    UserResponse updateUserAvatar(UUID userId, String tempPath);
    void updateLastActive(UUID userId);
    UserResponse updateExp(UUID id, int exp);
    UserStatsResponse getUserStats(UUID userId);
    UserResponse updateStreakOnActivity(UUID id);
    void resetStreakIfNoActivity(UUID id);
    UserResponse updateNativeLanguage(UUID id, String nativeLanguageCode);
    UserResponse updateCountry(UUID id, Country country);
    Character3dResponse getCharacter3dByUserId(UUID userId);
    void changePassword(UUID id, PasswordUpdateRequest request);
    void deactivateUser(UUID id, int daysToKeep);
    UserResponse restoreUser(UUID id);
    UserProfileResponse getUserProfile(UUID viewerId, UUID targetId);
    void admire(UUID senderId, UUID targetId);
    void registerFcmToken(NotificationRequest request);
    UserResponse updateSetupStatus(UUID id, boolean isFinished);
    UserResponse updatePlacementTestStatus(UUID id, boolean isDone);
    UserResponse trackDailyWelcome(UUID id);
    void sendStreakReminder(UUID id);
    LevelInfoResponse getLevelInfo(UUID id);
    Page<UserResponse> getSuggestedUsers(UUID userId, Pageable pageable);
    void activateVipTrial(UUID userId);
    void extendVipSubscription(UUID userId, BigDecimal amount);
    String getUserEmailByUserId(UUID userId);
    User findByUserId(UUID userId);
    User getUserIfExists(UUID userId);

    long countOnlineUsers();

    void changePassword(UUID userId, String currentPassword, String newPassword);
}