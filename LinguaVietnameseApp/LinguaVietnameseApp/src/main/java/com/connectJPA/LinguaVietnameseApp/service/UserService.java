package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.TeacherApplyRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.UserRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.*;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.enums.Country;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

public interface UserService {
    void admire(UUID senderId, UUID targetId);

    Page<UserResponse> getAllUsers(String email, String fullname, String nickname, Pageable pageable);
    UserResponse getUserById(UUID id);
    UserResponse createUser(UserRequest request);
    UserResponse updateUser(UUID id, UserRequest request);

    UserProfileResponse getUserProfile(UUID viewerId, UUID targetId);

    void deleteUser(UUID id);
    User getUserIfExists(UUID userId);
    String getUserEmailByUserId(UUID userId);
    User findByUserId(UUID userId);
    Character3dResponse getCharacter3dByUserId(UUID userId);
    UserResponse updateAvatarUrl(UUID id, String avatarUrl);
    UserResponse updateNativeLanguage(UUID id, String nativeLanguageCode);
    UserResponse updateCountry(UUID id, Country country);
    UserResponse updateExp(UUID id, int exp);
    UserStatsResponse getUserStats(UUID userId);

    UserResponse updateUserAvatar(UUID id, String newAvatarUrl);
    boolean emailExists(String email);
    void updateLastActive(UUID userId);

    UserResponse updateStreakOnActivity(UUID id);
    void resetStreakIfNoActivity(UUID id);
    void sendStreakReminder(UUID id);
    LevelInfoResponse getLevelInfo(UUID id);

    void registerFcmToken(NotificationRequest request);
}