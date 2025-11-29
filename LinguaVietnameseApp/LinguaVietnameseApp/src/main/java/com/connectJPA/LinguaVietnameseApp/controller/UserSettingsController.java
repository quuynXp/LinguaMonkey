package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.entity.UserSettings;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/user-settings")
@RequiredArgsConstructor
public class UserSettingsController {

    private final UserSettingsRepository userSettingsRepository;
    private final UserRepository userRepository;

    @GetMapping("/{userId}")
    public AppApiResponse<UserSettings> getSettings(@PathVariable UUID userId) {
        UserSettings settings = userSettingsRepository.findById(userId)
                .orElseGet(() -> createDefaultSettings(userId));
        return AppApiResponse.<UserSettings>builder()
                .code(200)
                .result(settings)
                .build();
    }

    @PatchMapping("/{userId}")
    public AppApiResponse<UserSettings> updateSettings(
            @PathVariable UUID userId,
            @RequestBody UserSettings request
    ) {
        UserSettings settings = userSettingsRepository.findById(userId)
                .orElseGet(() -> createDefaultSettings(userId));

        // Manual mapping for safety (or use Mapper)
        settings.setStudyReminders(request.isStudyReminders());
        settings.setStreakReminders(request.isStreakReminders());
        settings.setSoundEnabled(request.isSoundEnabled());
        settings.setVibrationEnabled(request.isVibrationEnabled());
        settings.setProfileVisibility(request.isProfileVisibility());
        settings.setProgressSharing(request.isProgressSharing());

        return AppApiResponse.<UserSettings>builder()
                .code(200)
                .result(userSettingsRepository.save(settings))
                .build();
    }

    private UserSettings createDefaultSettings(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        
        UserSettings defaultSettings = UserSettings.builder()
                .user(user)
                .studyReminders(true)
                .streakReminders(true)
                .soundEnabled(true)
                .vibrationEnabled(true)
                .profileVisibility(true)
                .progressSharing(false)
                .build();
        
        return userSettingsRepository.save(defaultSettings);
    }
}