package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.MoveRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.Character3dResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.LevelInfoResponse;
import com.connectJPA.LinguaVietnameseApp.dto.request.UserRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.UserResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Character3d;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.enums.AuthProvider;
import com.connectJPA.LinguaVietnameseApp.enums.Country;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
import com.connectJPA.LinguaVietnameseApp.mapper.Character3dMapper;
import com.connectJPA.LinguaVietnameseApp.mapper.UserMapper;
import com.connectJPA.LinguaVietnameseApp.repository.Character3dRepository;
import com.connectJPA.LinguaVietnameseApp.repository.LanguageRepository;
import com.connectJPA.LinguaVietnameseApp.repository.UserLearningActivityRepository;
import com.connectJPA.LinguaVietnameseApp.repository.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.*;
import com.connectJPA.LinguaVietnameseApp.utils.CloudinaryHelper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.dao.DataAccessException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;
    private final LanguageRepository languageRepository;
    private final UserLearningActivityRepository userLearningActivityRepository;
    private final UserMapper userMapper;
    private final Character3dMapper character3dMapper;
    private final RoleService roleService;
    private final Character3dRepository character3dRepository;
    private final NotificationService notificationService;
    private final CloudinaryService cloudinaryService;
    private final CloudinaryHelper cloudinaryHelper;
    private static final int EXP_PER_LEVEL = 1000;


    @Override
    public String getUserEmailByUserId(UUID userId) {
        try {
            User user = userRepository.findByUserIdAndIsDeletedFalse(userId)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            return user.getEmail();
        } catch (Exception e) {
            throw new AppException(ErrorCode.USER_NOT_FOUND);
        }
    }

    private Locale getLocaleByUserId(UUID userId) {
        User user = userRepository.findByUserIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return user.getNativeLanguageCode() != null ? Locale.forLanguageTag(user.getNativeLanguageCode()) : Locale.getDefault();
    }

    @Override
    @Cacheable(value = "users", key = "#email + ':' + #fullname + ':' + #nickname + ':' + #pageable.pageNumber + ':' + #pageable.pageSize")
    public Page<UserResponse> getAllUsers(String email, String fullname, String nickname, Pageable pageable) {
        try {
            if (pageable == null) {
                throw new AppException(ErrorCode.INVALID_PAGEABLE);
            }
            Page<User> users = userRepository.findByEmailContainingAndFullnameContainingAndNicknameContainingAndIsDeletedFalse(email, fullname, nickname, pageable);
            return users.map(userMapper::toResponse);
        } catch (Exception e) {
            log.error("Error while fetching all users: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Cacheable(value = "users", key = "#id")
    public UserResponse getUserById(UUID id) {
        try {
            if (id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            User user = userRepository.findByUserIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            return userMapper.toResponse(user);
        } catch (Exception e) {
            log.error("Error while fetching user by ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CachePut(value = "users", key = "#result.userId")
    public UserResponse createUser(UserRequest request) {
        try {
            if (request == null || request.getEmail() == null) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            User user = userMapper.toEntity(request);
            user.setAuthProvider(AuthProvider.EMAIL);
            user = userRepository.save(user);
            roleService.assignDefaultStudentRole(user.getUserId());
            return userMapper.toResponse(user);
        } catch (Exception e) {
            log.error("Error while creating user: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CachePut(value = "users", key = "#id")
    public UserResponse updateUser(UUID id, UserRequest request) {
        try {
            if (id == null || request == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            User user = userRepository.findByUserIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            userMapper.updateEntityFromRequest(request, user);
            user = userRepository.save(user);
            return userMapper.toResponse(user);
        } catch (Exception e) {
            log.error("Error while updating user ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = "users", key = "#id")
    public void deleteUser(UUID id) {
        try {
            if (id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            User user = userRepository.findByUserIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            userRepository.softDeleteById(id);
        } catch (Exception e) {
            log.error("Error while deleting user ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }



    @Override
    public User findByUserId(UUID userId) {
        try {
            return userRepository.findByUserIdAndIsDeletedFalse(userId)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        } catch (Exception e) {
            throw new AppException(ErrorCode.USER_NOT_FOUND);
        }
    }

    @Transactional
    @CachePut(value = "users", key = "#id")
    public UserResponse updateAvatarUrl(UUID id, String avatarUrl) {
        try {
            if (id == null || avatarUrl == null || avatarUrl.isBlank()) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            if (!isValidUrl(avatarUrl)) {
                throw new AppException(ErrorCode.INVALID_URL);
            }

            User user = userRepository.findByUserIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

            // Extract fromPublicId từ URL tạm
            String fromPublicId = cloudinaryHelper.extractPublicId(avatarUrl);

            // Tạo toPublicId trong folder userId
            String fileName = fromPublicId.substring(fromPublicId.lastIndexOf("/") + 1); // avatar123
            String toPublicId = "users/" + id + "/" + fileName;

            // Move bằng Cloudinary
            MoveRequest moveRequest = MoveRequest.builder()
                    .fromPublicId(fromPublicId)
                    .toPublicId(toPublicId)
                    .overwrite(true)
                    .resourceType("image")
                    .build();

            Map<?, ?> result = cloudinaryService.move(moveRequest);

            // Lấy URL mới sau khi move
            String newUrl = (String) result.get("secure_url");

            // Update user
            user.setAvatarUrl(newUrl);
            user = userRepository.save(user);

            // Notification
            NotificationRequest notificationRequest = NotificationRequest.builder()
                    .userId(id)
                    .title("Avatar Updated")
                    .content("Your profile avatar has been updated successfully.")
                    .type("AVATAR_UPDATE")
                    .build();
            notificationService.createNotification(notificationRequest);

            return userMapper.toResponse(user);
        } catch (Exception e) {
            log.error("Error while updating avatar URL for user ID {}: {}", id, e.getMessage(), e);
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }


    @Override
    @Transactional
    @CachePut(value = "users", key = "#id")
    public UserResponse updateNativeLanguage(UUID id, String nativeLanguageCode) {
        try {
            if (id == null || nativeLanguageCode == null || nativeLanguageCode.isBlank()) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            User user = userRepository.findByUserIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            if (!languageRepository.existsByLanguageCodeAndIsDeletedFalse(nativeLanguageCode)) {
                throw new AppException(ErrorCode.LANGUAGE_NOT_FOUND);
            }
            user.setNativeLanguageCode(nativeLanguageCode);
            user = userRepository.save(user);

            // Create notification for native language update
            NotificationRequest notificationRequest = NotificationRequest.builder()
                    .userId(id)
                    .title("Native Language Updated")
                    .content("Your native language has been updated to: " + nativeLanguageCode)
                    .type("NATIVE_LANGUAGE_UPDATE")
                    .build();
            notificationService.createNotification(notificationRequest);

            return userMapper.toResponse(user);
        } catch (Exception e) {
            log.error("Error while updating native language for user ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CachePut(value = "users", key = "#id")
    public UserResponse updateCountry(UUID id, Country country) {
        try {
            if (id == null || country == null) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            User user = userRepository.findByUserIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            user.setCountry(country);
            user = userRepository.save(user);

            // Create notification for country update
            NotificationRequest notificationRequest = NotificationRequest.builder()
                    .userId(id)
                    .title("Country Updated")
                    .content("Your country has been updated to: " + country.name())
                    .type("COUNTRY_UPDATE")
                    .build();
            notificationService.createNotification(notificationRequest);

            return userMapper.toResponse(user);
        } catch (Exception e) {
            log.error("Error while updating country for user ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CachePut(value = "users", key = "#id")
    public UserResponse updateExp(UUID id, int exp) {
        try {
            if (id == null || exp < 0) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            User user = userRepository.findByUserIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            String email = getUserEmailByUserId(id);
            Locale locale = getLocaleByUserId(id);
            int oldExp = user.getExp();
            int oldLevel = user.getLevel();
            int newExp = oldExp + exp; // Add new EXP to existing EXP
            user.setExp(newExp);
            int newLevel = calculateLevel(newExp);
            if (newLevel > oldLevel) {
                user.setLevel(newLevel);
                // Create notification and send email if leveled up
                NotificationRequest notificationRequest = NotificationRequest.builder()
                        .userId(id)
                        .title("Level Up!")
                        .content("Congratulations! You have reached level " + newLevel + " with " + newExp + " EXP!")
                        .type("LEVEL_UP")
                        .build();
                notificationService.createNotification(notificationRequest);
                notificationService.sendAchievementNotification(id, "Level Up", "You have reached level " + newLevel + "!");
            } else if (exp > 0) {
                // Create notification for EXP gain
                NotificationRequest notificationRequest = NotificationRequest.builder()
                        .userId(id)
                        .title("Experience Points Gained")
                        .content("You have gained " + exp + " EXP! Total EXP: " + newExp)
                        .type("EXP_UPDATE")
                        .build();
                notificationService.createNotification(notificationRequest);
            }
            user = userRepository.save(user);
            return userMapper.toResponse(user);
        } catch (Exception e) {
            log.error("Error while updating exp for user ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CachePut(value = "users", key = "#id")
    public UserResponse updateStreakOnActivity(UUID id) {
        try {
            if (id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            User user = userRepository.findByUserIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            LocalDate today = LocalDate.now();
            boolean hasActivityToday = userLearningActivityRepository.existsByUserIdAndDate(id, today);
            if (!hasActivityToday) {
                // Increment streak if no activity recorded yet today
                int currentStreak = user.getStreak();
                user.setStreak(currentStreak + 1);
                user = userRepository.save(user);
                // Create notification for streak update
                NotificationRequest notificationRequest = NotificationRequest.builder()
                        .userId(id)
                        .title("Streak Updated")
                        .content("Great job! Your streak is now " + (currentStreak + 1) + " days!")
                        .type("STREAK_UPDATE")
                        .build();
                notificationService.createNotification(notificationRequest);
                notificationService.sendStreakRewardNotification(id, currentStreak + 1);
            }
            return userMapper.toResponse(user);
        } catch (Exception e) {
            log.error("Error while updating streak for user ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CachePut(value = "users", key = "#id")
    public void resetStreakIfNoActivity(UUID id) {
        try {
            if (id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            User user = userRepository.findByUserIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            LocalDate yesterday = LocalDate.now().minusDays(1);
            boolean hasActivityYesterday = userLearningActivityRepository.existsByUserIdAndDate(id, yesterday);
            if (!hasActivityYesterday && user.getStreak() > 0) {
                // Reset streak to 0 if no activity was recorded yesterday
                user.setStreak(0);
                user = userRepository.save(user);
                // Create notification for streak reset
                NotificationRequest notificationRequest = NotificationRequest.builder()
                        .userId(id)
                        .title("Streak Reset")
                        .content("Your streak has been reset to 0 due to inactivity.")
                        .type("STREAK_RESET")
                        .build();
                notificationService.createNotification(notificationRequest);
            }
        } catch (Exception e) {
            log.error("Error while resetting streak for user ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public void sendStreakReminder(UUID id) {
        try {
            if (id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            User user = userRepository.findByUserIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            LocalDate today = LocalDate.now();
            boolean hasActivityToday = userLearningActivityRepository.existsByUserIdAndDate(id, today);
            if (!hasActivityToday && user.getStreak() > 0) {
                // Send push notification to remind user to maintain streak
                NotificationRequest notificationRequest = NotificationRequest.builder()
                        .userId(id)
                        .title("Keep Your Streak Alive!")
                        .content("Complete a lesson today to maintain your " + user.getStreak() + "-day streak!")
                        .type("STREAK_REMINDER")
                        .build();
                notificationService.createPushNotification(notificationRequest);
            }
        } catch (Exception e) {
            log.error("Error while sending streak reminder for user ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Cacheable(value = "levelInfo", key = "#id")
    public LevelInfoResponse getLevelInfo(UUID id) {
        try {
            if (id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            User user = userRepository.findByUserIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            int currentLevel = user.getLevel();
            int currentExp = user.getExp();
            int nextLevelExp = (currentLevel * EXP_PER_LEVEL);
            return LevelInfoResponse.builder()
                    .currentLevel(currentLevel)
                    .currentExp(currentExp)
                    .nextLevelExp(nextLevelExp)
                    .build();
        } catch (Exception e) {
            log.error("Error while fetching level info for user ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    private boolean isValidUrl(String url) {
        // Basic URL validation (can be enhanced with regex or URL class)
        return url != null && (url.startsWith("http://") || url.startsWith("https://")) && url.length() <= 255;
    }

    private int calculateLevel(int exp) {
        // Simple level calculation: 1000 EXP per level
        return exp / EXP_PER_LEVEL + 1;
    }

    @Override
    public Character3dResponse getCharacter3dByUserId(UUID userId) {
        try {
            User user = userRepository.findByUserIdAndIsDeletedFalse(userId).orElseThrow(()-> new AppException((ErrorCode.USER_NOT_FOUND)));
            Character3d character =  character3dRepository.findByCharacter3dIdAndIsDeletedFalse(user.getCharacter3dId())
                    .orElseThrow(() -> new AppException(ErrorCode.CHARACTER3D_NOT_FOUND));

            return character3dMapper.toResponse(character);
        } catch (IllegalArgumentException e) {
            throw new AppException(ErrorCode.INVALID_KEY);
        } catch (DataAccessException e) {
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        } catch (Exception e) {
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }
}