package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.*;
import com.connectJPA.LinguaVietnameseApp.dto.response.*;
import com.connectJPA.LinguaVietnameseApp.entity.*;
import com.connectJPA.LinguaVietnameseApp.entity.id.LeaderboardEntryId;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserCertificateId;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserInterestId;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserLanguageId;
import com.connectJPA.LinguaVietnameseApp.enums.*;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
import com.connectJPA.LinguaVietnameseApp.mapper.Character3dMapper;
import com.connectJPA.LinguaVietnameseApp.mapper.UserMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.*;
import com.connectJPA.LinguaVietnameseApp.service.*;
import com.connectJPA.LinguaVietnameseApp.utils.UserStatusUtils;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.context.annotation.Lazy;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.RandomStringUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserServiceImpl implements UserService {
    private final LeaderboardEntryRepository leaderboardEntryRepository;
    private final LeaderboardRepository leaderboardRepository;
    private final InterestRepository interestRepository;
    private final UserRepository userRepository;
    private final LanguageRepository languageRepository;
    private final UserLearningActivityRepository userLearningActivityRepository;
    private final UserMapper userMapper;
    private final Character3dMapper character3dMapper;
    private final RoleService roleService;
    private final Character3dRepository character3dRepository;
    private final NotificationService notificationService;
    private final UserGoalRepository userGoalRepository;
    private final UserInterestRepository userInterestRepository;
    private final LeaderboardEntryService leaderboardEntryService;
    private static final int EXP_PER_LEVEL = 1000;
    private final UserLearningActivityService userLearningActivityService;
    private final UserCertificateRepository userCertificateRepository;
    private final PasswordEncoder passwordEncoder;
    private final ChatMessageRepository chatMessageRepository;
    private final VideoCallRepository videoCallRepository;
    private final AuthenticationServiceImpl authenticationService;
    private final UserRoleRepository userRoleRepository;
    private final AdmirationRepository admirationRepository;
    private final BadgeService badgeService;
    private final FriendshipService friendshipService;
    private final CourseService courseService;
    private final CoupleService coupleService;
    private final EventService eventService;
    private final DatingInviteRepository datingInviteRepository;
    private final StorageService storageService;
    private final WalletRepository walletRepository;
    private final UserFcmTokenRepository userFcmTokenRepository;
    private final UserSettingsRepository userSettingsRepository;
    @PersistenceContext
    private EntityManager entityManager;
    private final UserLanguageRepository userLanguageRepository;
    private final UserBadgeRepository userBadgeRepository;
    private final UserAuthAccountRepository userAuthAccountRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final LessonRepository lessonRepository;
    
    // Injected Repositories for detailed logic
    private final CoupleRepository coupleRepository;
    private final FriendshipRepository friendshipRepository;

    // INJECT DailyChallengeService (Lazy to avoid circular dependency)
    @Lazy
    private final DailyChallengeService dailyChallengeService;

    @Override
    public long countOnlineUsers() {
        OffsetDateTime threshold = OffsetDateTime.now().minusMinutes(5);
        return userRepository.countOnlineUsers(threshold);
    }
    
    @Override
    public Page<UserResponse> getSuggestedUsers(UUID userId, Pageable pageable) {
        User currentUser = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return userRepository.findSuggestedUsers(
                userId,
                currentUser.getCountry(),
                currentUser.getNativeLanguageCode(),
                currentUser.getAgeRange(),
                pageable
        ).map(userMapper::toResponse);
    }

    @Override
public Page<UserProfileResponse> searchPublicUsers(UUID viewerId, String keyword, Country country, String gender, AgeRange ageRange, Pageable pageable) {
    try {
        Page<User> users = userRepository.searchAdvanced(keyword, country, gender, ageRange, pageable);

        List<UserProfileResponse> profileResponses = users.stream()
                .filter(u -> !u.isDeleted())
                .map(user -> getUserProfile(viewerId, user.getUserId())) // Lưu ý: hàm này có thể gây N+1 query, nên tối ưu sau
                .collect(Collectors.toList());
        
        return new PageImpl<>(profileResponses, pageable, users.getTotalElements());
    } catch (Exception e) {
        log.error("Error searching public users", e);
        throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
    }
}

    @Transactional
    @Override
    public void activateVipTrial(UUID userId) {
        User user = userRepository.findByUserIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        
        user.setVipExpirationDate(OffsetDateTime.now().plusDays(14));
        userRepository.saveAndFlush(user);
        notificationService.sendVipSuccessNotification(userId, false, "14-Day Trial");
    }

    @Transactional
    @Override
    public void extendVipSubscription(UUID userId, BigDecimal amount) {
        User user = userRepository.findByUserIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        OffsetDateTime currentExpiry = user.getVipExpirationDate();
        if (currentExpiry == null || currentExpiry.isBefore(OffsetDateTime.now())) {
            currentExpiry = OffsetDateTime.now();
        }
        String planType;
        if (amount.compareTo(new BigDecimal("90")) > 0) {
            user.setVipExpirationDate(currentExpiry.plusYears(1));
            planType = "Yearly";
        } else {
            user.setVipExpirationDate(currentExpiry.plusMonths(1));
            planType = "Monthly";
        }
        
        userRepository.saveAndFlush(user);
        notificationService.sendVipSuccessNotification(userId, true, planType);
    }

    private UserResponse mapUserToResponseWithAllDetails(User user) {
        if (user == null) {
            return null;
        }
        UserResponse response = userMapper.toResponse(user);
        response.setHasFinishedSetup(user.isHasFinishedSetup());
        response.setHasDonePlacementTest(user.isHasDonePlacementTest());
        response.setLastDailyWelcomeAt(user.getLastDailyWelcomeAt());
        response.setGender(user.getGender());
        
        boolean isVip = user.isVip();
        response.setVip(isVip); 
        
        if (isVip && user.getVipExpirationDate() != null) {
             long days = Duration.between(OffsetDateTime.now(), user.getVipExpirationDate()).toDays();
             response.setVipDaysRemaining(Math.max(0, days)); 
        } else {
             response.setVipDaysRemaining(0L);
        }
        int nextLevelExp = user.getLevel() * EXP_PER_LEVEL;
        response.setExpToNextLevel(nextLevelExp);
        try {
            List<String> languages = userLanguageRepository.findLanguageCodesByUserId(user.getUserId());
            response.setLanguages(languages);
        } catch (Exception e) {
            log.warn("Failed to fetch languages for user {}: {}", user.getUserId(), e.getMessage());
            response.setLanguages(Collections.emptyList());
        }
        try {
            Optional<UserBadge> latestBadge = userBadgeRepository.findFirstByIdUserIdAndIsDeletedFalseOrderByCreatedAtDesc(user.getUserId());
            latestBadge.ifPresent(userBadge -> response.setBadgeId(userBadge.getId().getBadgeId()));
        } catch (Exception e) {
            log.warn("Failed to fetch badgeId for user {}: {}", user.getUserId(), e.getMessage());
        }
        try {
            Optional<UserAuthAccount> primaryAuth = userAuthAccountRepository.findByUser_UserIdAndIsPrimaryTrue(user.getUserId());
            if (primaryAuth.isPresent()) {
                response.setAuthProvider(String.valueOf(primaryAuth.get().getProvider()));
            } else {
                Optional<UserAuthAccount> anyAuth = userAuthAccountRepository.findFirstByUser_UserIdOrderByLinkedAtAsc(user.getUserId());
                anyAuth.ifPresent(auth -> response.setAuthProvider(String.valueOf(auth.getProvider())));
            }
        } catch (Exception e) {
            log.warn("Failed to fetch authProvider for user {}: {}", user.getUserId(), e.getMessage());
        }
        try {
            long completedLessons = lessonProgressRepository.countByIdUserIdAndCompletedAtIsNotNullAndIsDeletedFalse(user.getUserId());
            long totalLessons = lessonRepository.countByIsDeletedFalse();
            if (totalLessons > 0) {
                double progressCalc = ((double) completedLessons / totalLessons) * 100.0;
                response.setProgress(Math.round(progressCalc * 100.0) / 100.0);
            } else {
                response.setProgress(0.0);
            }
        } catch (Exception e) {
            log.warn("Failed to calculate progress for user {}: {}", user.getUserId(), e.getMessage());
            response.setProgress(0.0);
        }
        try {
            List<String> certIds = userCertificateRepository.findAllByIdUserId(user.getUserId())
                    .stream()
                    .map(cert -> cert.getId().getCertificate())
                    .collect(Collectors.toList());
            response.setCertificationIds(certIds);
        } catch (Exception e) {
            log.warn("Failed to fetch certifications for user {}: {}", user.getUserId(), e.getMessage());
            response.setCertificationIds(Collections.emptyList());
        }
        try {
            List<UUID> interestIds = userInterestRepository.findById_UserIdAndIsDeletedFalse(user.getUserId())
                    .stream()
                    .map(ui -> ui.getId().getInterestId())
                    .collect(Collectors.toList());
            response.setInterestIds(interestIds);
        } catch (Exception e) {
            log.warn("Failed to fetch interests for user {}: {}", user.getUserId(), e.getMessage());
            response.setInterestIds(Collections.emptyList());
        }
        try {
            List<String> goalIds = userGoalRepository.findByUserIdAndIsDeletedFalse(user.getUserId())
                    .stream()
                    .map(ug -> ug.getGoalType().toString())
                    .collect(Collectors.toList());
            response.setGoalIds(goalIds);
        } catch (Exception e) {
            log.warn("Failed to fetch goals for user {}: {}", user.getUserId(), e.getMessage());
            response.setGoalIds(Collections.emptyList());
        }
        try {
            if (coupleService != null) {
                CoupleProfileSummary cps = coupleService.getCoupleProfileSummaryByUser(user.getUserId(), user.getUserId());
                response.setCoupleProfile(cps);
            }
        } catch (Exception e) {
            log.warn("Failed to fetch couple profile for user {}: {}", user.getUserId(), e.getMessage());
        }
        return response;
    }

    @Override
    public Page<UserResponse> getAllUsers(String email, String fullname, String nickname, Pageable pageable) {
        try {
            if (pageable == null) {
                throw new AppException(ErrorCode.INVALID_PAGEABLE);
            }
            Page<User> users = userRepository.findByEmailContainingAndFullnameContainingAndNicknameContainingAndIsDeletedFalse(email, fullname, nickname, pageable);
            return users.map(this::mapUserToResponseWithAllDetails);
        } catch (Exception e) {
            log.error("Error while fetching all users: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public UserResponse getUserById(UUID id) {
        try {
            if (id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            User user = userRepository.findByUserIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            return mapUserToResponseWithAllDetails(user);
        } catch (Exception e) {
            log.error("Error while fetching user by ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public boolean emailExists(String email) {
        if (email == null) return false;
        return userRepository.existsByEmailIgnoreCaseAndIsDeletedFalse(email.trim());
    }

    @Override
    @Transactional
    public UserResponse createUser(UserRequest request) {
        try {
            if (request == null) throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            if (request.getEmail() == null || request.getEmail().trim().isEmpty()) throw new AppException(ErrorCode.INVALID_REQUEST);
            if (userRepository.existsByEmailAndIsDeletedFalse(request.getEmail())) throw new AppException(ErrorCode.EMAIL_ALREADY_EXISTS);

            User user = new User();
            user.setEmail(request.getEmail().trim());
            if (request.getPassword() != null && !request.getPassword().isBlank()) {
                user.setPassword(passwordEncoder.encode(request.getPassword()));
            } else {
                user.setPassword(passwordEncoder.encode(RandomStringUtils.randomAlphanumeric(16)));
            }
            if (request.getFullname() != null) user.setFullname(request.getFullname());
            if (request.getNickname() != null) user.setNickname(request.getNickname());
            if (request.getCharacter3dId() != null) user.setCharacter3dId(request.getCharacter3dId());
            if (request.getNativeLanguageCode() != null) user.setNativeLanguageCode(request.getNativeLanguageCode().toLowerCase());
            if (request.getCountry() != null) user.setCountry(request.getCountry());
            if (request.getLearningPace() != null) user.setLearningPace(request.getLearningPace());
            if (request.getAgeRange() != null) user.setAgeRange(request.getAgeRange());
            if (request.getGender() != null) user.setGender(request.getGender());
            if (request.getDayOfBirth() != null) {
                user.setDayOfBirth(request.getDayOfBirth());
                calculateAndSetAgeRange(user);
            }
            
            user = userRepository.saveAndFlush(user);

            UserSettings userSettings = UserSettings.builder()
                    .user(user)
                    .userId(user.getUserId())
                    .build();
            userSettingsRepository.saveAndFlush(userSettings);
            
            if (request.getAuthProvider() == null || request.getAuthProvider().equals(AuthProvider.EMAIL.toString())) {
                authenticationService.createAuthAccountLink(user, AuthProvider.EMAIL, user.getEmail());
            }

            Wallet newWallet = Wallet.builder().user(user).balance(BigDecimal.ZERO).build();
            walletRepository.save(newWallet);
            
            if (dailyChallengeService != null) {
                dailyChallengeService.assignAllChallengesToNewUser(user.getUserId());
            }

            // --- AUTO ASSIGN STARTER BADGES ---
            if (badgeService != null) {
                badgeService.assignStarterBadges(user.getUserId());
            }

            roleService.assignRoleToUser(user.getUserId(), RoleName.STUDENT);
            Leaderboard lb = leaderboardRepository.findLatestByTabAndIsDeletedFalse("global", PageRequest.of(0,1))
                    .stream().findFirst().orElseThrow(() -> new AppException(ErrorCode.LEADERBOARD_NOT_FOUND));
            
            leaderboardEntryRepository.saveAndFlush(LeaderboardEntry.builder()
                    .leaderboardEntryId(new LeaderboardEntryId(user.getUserId(), lb.getLeaderboardId()))
                    .user(user)
                    .leaderboard(lb)
                    .build());
            
            userLearningActivityRepository.saveAndFlush(UserLearningActivity.builder()
                    .userId(user.getUserId())
                    .activityType(ActivityType.START_LEARNING)
                    .build());

            final User savedUser = user;
            if (request.getGoalIds() != null && !request.getGoalIds().isEmpty()) {
                List<UserGoal> userGoals = request.getGoalIds().stream()
                        .filter(Objects::nonNull)
                        .map(goalStr -> {
                            try {
                                return UserGoal.builder().userId(savedUser.getUserId()).goalType(GoalType.valueOf(goalStr.toUpperCase())).build();
                            } catch (IllegalArgumentException ex) { return null; }
                        })
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());
                if (!userGoals.isEmpty()) userGoalRepository.saveAllAndFlush(userGoals);
            }
            
            User userWithSettings = userRepository.findByUserIdAndIsDeletedFalse(user.getUserId())
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            return mapUserToResponseWithAllDetails(userWithSettings);
        } catch (AppException ae) {
            throw ae;
        } catch (Exception e) {
            log.error("Error creating user: {}", e.getMessage(), e);
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public UserResponse updateUser(UUID id, UserRequest request) {
        try {
            if (id == null || request == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            User user = updateBasicUserInfo(id, request);
            final UUID userId = user.getUserId();
            if (request.getGoalIds() != null) {
                updateUserGoals(userId, request.getGoalIds());
            }
            
            if (request.getCertificationIds() != null) {
                updateUserCertifications(userId, request.getCertificationIds());
            }
            
            if (request.getInterestIds() != null) {
                updateUserInterests(userId, request.getInterestIds());
            }
            
            if (request.getLanguages() != null) {
                updateUserLanguages(userId, request.getLanguages());
            }
            
            User finalUser = userRepository.findByUserIdAndIsDeletedFalse(userId)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            
            return mapUserToResponseWithAllDetails(finalUser);
            
        } catch (Exception e) {
            log.error("Error while updating user ID {}: {}", id, e.getMessage(), e);
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    private User updateBasicUserInfo(UUID id, UserRequest request) {
        User user = userRepository.findByUserIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        
        if (request.getEmail() != null) user.setEmail(request.getEmail());
        
        if (request.getFullname() != null) user.setFullname(request.getFullname());
        if (request.getNickname() != null) user.setNickname(request.getNickname());
        if (request.getBio() != null) user.setBio(request.getBio());
        if (request.getPhone() != null) user.setPhone(request.getPhone());
        if (request.getAvatarUrl() != null) user.setAvatarUrl(request.getAvatarUrl());
        if (request.getCharacter3dId() != null) user.setCharacter3dId(request.getCharacter3dId());
        
        if (request.getDayOfBirth() != null) {
            user.setDayOfBirth(request.getDayOfBirth());
            calculateAndSetAgeRange(user);
        } else if (request.getAgeRange() != null) {
            user.setAgeRange(request.getAgeRange());
        }
        if (request.getLearningPace() != null) user.setLearningPace(request.getLearningPace());
        if (request.getCountry() != null) user.setCountry(request.getCountry());
        if (request.getNativeLanguageCode() != null) user.setNativeLanguageCode(request.getNativeLanguageCode());
        if (request.getProficiency() != null) user.setProficiency(request.getProficiency());
        if (request.getLevel() != null) user.setLevel(request.getLevel());
        if (request.getStreak() != null) user.setStreak(request.getStreak());
        if (request.getGender() != null) user.setGender(request.getGender());
        
        return userRepository.saveAndFlush(user);
    }

    private void calculateAndSetAgeRange(User user) {
        if (user.getDayOfBirth() == null) return;
        
        int age = Period.between(user.getDayOfBirth(), LocalDate.now()).getYears();
        
        for (AgeRange range : AgeRange.values()) {
            if (range.isInRange(age)) {
                user.setAgeRange(range);
                break;
            }
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void updateUserLanguages(UUID userId, List<String> languageCodes) {
        userLanguageRepository.deleteAllInBatch(
                userLanguageRepository.findByIdUserId(userId)
        );
        userLanguageRepository.flush();
        entityManager.clear();
        
        List<UserLanguage> languages = languageCodes.stream()
                .filter(Objects::nonNull)
                .filter(langCode -> languageRepository.existsByLanguageCodeAndIsDeletedFalse(langCode))
                .map(langCode -> {
                    UserLanguageId id = UserLanguageId.builder()
                            .languageCode(langCode)
                            .userId(userId)
                            .build();
                    
                    return UserLanguage.builder()
                            .id(id)
                            .proficiencyLevel(null)
                            .build();
                })
                .collect(Collectors.toList());
        
        if (!languages.isEmpty()) {
            userLanguageRepository.saveAllAndFlush(languages);
        }
        entityManager.clear();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void updateUserInterests(UUID userId, List<UUID> interestIds) {
        userInterestRepository.deleteAllInBatch(
                userInterestRepository.findById_UserIdAndIsDeletedFalse(userId)
        );
        userInterestRepository.flush();
        entityManager.clear();
        List<UserInterest> interests = interestIds.stream()
                .filter(Objects::nonNull)
                .filter(interestRepository::existsById)
                .map(interestId -> {
                    UserInterestId id = new UserInterestId();
                    id.setUserId(userId);
                    id.setInterestId(interestId);
                    UserInterest ui = new UserInterest();
                    ui.setId(id);
                    return ui;
                })
                .collect(Collectors.toList());
        if (!interests.isEmpty()) {
            userInterestRepository.saveAllAndFlush(interests);
        }
        entityManager.clear();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void updateUserGoals(UUID userId, List<String> goalIds) {
        userGoalRepository.deleteAllInBatch(
                userGoalRepository.findByUserIdAndIsDeletedFalse(userId)
        );
        userGoalRepository.flush();
        entityManager.clear();
        
        List<UserGoal> userGoals = goalIds.stream()
                .filter(Objects::nonNull)
                .map(goalStr -> {
                    try {
                        return UserGoal.builder()
                                .userId(userId)
                                .goalType(GoalType.valueOf(goalStr.toUpperCase()))
                                .build();
                    } catch (IllegalArgumentException ex) {
                        log.warn("Unknown GoalType: {}", goalStr);
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
        
        if (!userGoals.isEmpty()) {
            userGoalRepository.saveAllAndFlush(userGoals);
        }
        entityManager.clear();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void updateUserCertifications(UUID userId, List<String> certIds) {
        userCertificateRepository.deleteAllInBatch(
                userCertificateRepository.findAllByIdUserId(userId)
        );
        userCertificateRepository.flush();
        entityManager.clear();
        
        List<UserCertificate> certs = certIds.stream()
                .filter(Objects::nonNull)
                .map(certStr -> {
                    try {
                        return UserCertificate.builder()
                                .id(new UserCertificateId(userId,
                                        Certification.valueOf(certStr.toUpperCase()).toString()))
                                .build();
                    } catch (IllegalArgumentException ex) {
                        log.warn("Unknown Certification: {}", certStr);
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .toList();
        
        if (!certs.isEmpty()) {
            userCertificateRepository.saveAllAndFlush(certs);
        }
        entityManager.clear();
    }

    @Transactional(readOnly = true)
    @Override
    public UserProfileResponse getUserProfile(UUID viewerId, UUID targetId) {
        if (targetId == null) throw new AppException(ErrorCode.INVALID_KEY);
        User target = userRepository.findByUserIdAndIsDeletedFalse(targetId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        List<String> languages = new ArrayList<>();
        try {
            languages = userLanguageRepository.findLanguageCodesByUserId(targetId);
        } catch (Exception e) {
            log.warn("Failed to fetch languages for user profile {}: {}", targetId, e.getMessage());
        }
        UserProfileResponse.UserProfileResponseBuilder respB = UserProfileResponse.builder()
                .userId(target.getUserId())
                .fullname(target.getFullname())
                .nickname(target.getNickname())
                .avatarUrl(target.getAvatarUrl())
                .country(target.getCountry())
                .level(target.getLevel())
                .streak(target.getStreak())    
                .languages(languages)            
                .exp(target.getExp())
                .bio(target.getBio())
                .gender(target.getGender())
                .ageRange(target.getAgeRange())        
                .proficiency(target.getProficiency())
                .learningPace(target.getLearningPace())
                .lastActiveAt(target.getLastActiveAt())
                .isOnline(UserStatusUtils.isOnline(target.getLastActiveAt()))
                .lastActiveText(UserStatusUtils.formatLastActive(target.getLastActiveAt()));
        try {
             respB.allowStrangerChat(true); 
        } catch (Exception e) {
             respB.allowStrangerChat(true);
        }
        
        if (target.getCountry() != null) {
            respB.flag(target.getCountry().name());
        }
        try {
            if (target.getCharacter3dId() != null) {
                Character3dResponse ch = character3dMapper.toResponse(
                        character3dRepository.findByCharacter3dIdAndIsDeletedFalse(target.getCharacter3dId())
                                .orElse(null));
                respB.character3d(ch);
            }
        } catch (Exception e) {
            log.debug("character3d mapping failed for user {}: {}", targetId, e.getMessage());
        }
        try {
            respB.stats(this.getUserStats(targetId));
        } catch (Exception e) {
            log.debug("getUserStats failed for {}: {}", targetId, e.getMessage());
        }
        try {
            if (badgeService != null) {
                respB.badges(badgeService.getBadgesForUser(targetId));
            }
        } catch (Exception e) {
            log.debug("getBadgesForUser failed: {}", e.getMessage());
        }
        boolean isFriend = false;
        
        // FIX: Removed .status("NONE") usage
        FriendRequestStatusResponse friendReqStatus = FriendRequestStatusResponse.builder()
                .hasSentRequest(false)
                .hasReceivedRequest(false)
                .build();
        
        boolean canSendFriendRequest = true;
        boolean canUnfriend = false;
        boolean canBlock = false;
        
        if (viewerId != null) {
            try {
                isFriend = friendshipService.isFriends(viewerId, targetId);
                friendReqStatus = friendshipService.getFriendRequestStatus(viewerId, targetId);
                canUnfriend = isFriend;
                canBlock = true;
                
                // FIX: Check boolean flag instead of string equality
                canSendFriendRequest = !isFriend && (friendReqStatus == null || !friendReqStatus.isHasSentRequest());
                
                if (isFriend) {
                    Optional<Friendship> friendshipOpt = friendshipRepository.findByIdRequesterIdAndIdReceiverIdAndIsDeletedFalse(viewerId, targetId)
                            .or(() -> friendshipRepository.findByIdRequesterIdAndIdReceiverIdAndIsDeletedFalse(targetId, viewerId));
                    
                    if (friendshipOpt.isPresent()) {
                        Friendship f = friendshipOpt.get();
                        OffsetDateTime startDate = f.getUpdatedAt(); // Usually Accepted At
                        if (startDate == null) startDate = f.getCreatedAt();
                        
                        long days = ChronoUnit.DAYS.between(startDate.toLocalDate(), LocalDate.now());
                        respB.friendshipDurationDays(days);
                    }
                }

            } catch (Exception e) {
                log.debug("friendship check failed: {}", e.getMessage());
            }
        } else {
            canSendFriendRequest = false;
        }
        respB.isFriend(isFriend)
                .friendRequestStatus(friendReqStatus)
                .canSendFriendRequest(canSendFriendRequest)
                .canUnfriend(canUnfriend)
                .canBlock(canBlock);
        long admirationCount = admirationRepository.countByUserId(targetId);
        boolean hasAdmired = false;
        if (viewerId != null) {
            hasAdmired = admirationRepository.existsByUserIdAndSenderId(targetId, viewerId);
        }
        respB.admirationCount(admirationCount).hasAdmired(hasAdmired);
        boolean isTeacher = false;
        List<CourseSummaryResponse> teacherCourses = Collections.emptyList();
        try {
            isTeacher = roleService.userHasRole(targetId, RoleName.TEACHER);
            if (isTeacher && courseService != null) {
                teacherCourses = courseService.getCourseSummariesByTeacher(targetId, 5);
            }
        } catch (Exception e) {
            log.debug("teacher check or courses load failed: {}", e.getMessage());
        }
        respB.isTeacher(isTeacher).teacherCourses(teacherCourses);
        Map<String, Integer> leaderboardRanks = new HashMap<>();
        try {
            Integer globalRank = leaderboardEntryService.getRankForUserByTab("global", "student", targetId);
            if (globalRank != null) leaderboardRanks.put("global_student", globalRank);
            if (target.getCountry() != null) {
                Integer countryRank = leaderboardEntryService.getRankForUserByTab(target.getCountry().name(), "student", targetId);
                if (countryRank != null) leaderboardRanks.put("country_student", countryRank);
            }
            Integer teacherRank = leaderboardEntryService.getRankForUserByTab("global", "teacher", targetId);
            if (teacherRank != null) leaderboardRanks.put("teacher", teacherRank);
        } catch (Exception e) {
            log.debug("leaderboard rank fetch failed: {}", e.getMessage());
        }
        respB.leaderboardRanks(leaderboardRanks);
        
        // --- NEW LOGIC: Detailed Couple Info ---
        try {
            Optional<Couple> coupleOpt = coupleRepository.findByUserId(targetId);
            if (coupleOpt.isPresent()) {
                Couple c = coupleOpt.get();
                User partner = c.getUser1().getUserId().equals(targetId) ? c.getUser2() : c.getUser1();
                
                long daysInLove = 0;
                if (c.getStartDate() != null) {
                    daysInLove = ChronoUnit.DAYS.between(c.getStartDate(), LocalDate.now());
                } else if (c.getCoupleStartDate() != null) {
                    daysInLove = ChronoUnit.DAYS.between(c.getCoupleStartDate().toLocalDate(), LocalDate.now());
                }

                CoupleProfileDetailedResponse coupleDetailed = CoupleProfileDetailedResponse.builder()
                        .coupleId(c.getId())
                        .status(c.getStatus().name())
                        .partnerId(partner.getUserId())
                        .partnerName(partner.getFullname())
                        .partnerNickname(partner.getNickname())
                        .partnerAvatar(partner.getAvatarUrl())
                        .startDate(c.getStartDate())
                        .daysInLove(Math.max(0, daysInLove))
                        .sharedAvatarUrl(c.getSharedAvatarUrl())
                        .build();

                respB.coupleInfo(coupleDetailed);
                
                // Logic expiration for Exploring couple
                if (c.getStatus() == CoupleStatus.EXPLORING && c.getExploringExpiresAt() != null) {
                    Duration rem = Duration.between(OffsetDateTime.now(), c.getExploringExpiresAt());
                    long seconds = Math.max(0, rem.getSeconds());
                    long days = seconds / (24*3600);
                    long hours = (seconds % (24*3600)) / 3600;
                    String exploringExpiresInHuman = days + " ngày " + hours + " giờ";
                    boolean exploringExpiringSoon = seconds > 0 && seconds <= (2 * 24 * 3600);
                    
                    respB.exploringExpiresInHuman(exploringExpiresInHuman);
                    respB.exploringExpiringSoon(exploringExpiringSoon);
                }
            }
        } catch (Exception e) {
            log.debug("couple info fetch failed: {}", e.getMessage());
        }

        try {
            DatingInviteSummary inviteSummary = null;
            if (viewerId != null && datingInviteRepository != null) {
                Optional<DatingInvite> sent = datingInviteRepository.findTopBySenderIdAndTargetIdAndStatus(viewerId, targetId, DatingInviteStatus.PENDING);
                Optional<DatingInvite> received = datingInviteRepository.findTopBySenderIdAndTargetIdAndStatus(targetId, viewerId, DatingInviteStatus.PENDING);
                DatingInvite di = sent.orElseGet(() -> received.orElse(null));
                if (di != null) {
                    long secondsToExpire = di.getExpiresAt() != null ? Math.max(0, Duration.between(OffsetDateTime.now(), di.getExpiresAt()).getSeconds()) : 0;
                    inviteSummary = DatingInviteSummary.builder()
                            .inviteId(di.getInviteId())
                            .senderId(di.getSenderId())
                            .targetId(di.getTargetId())
                            .status(di.getStatus())
                            .createdAt(di.getCreatedAt())
                            .expiresAt(di.getExpiresAt())
                            .viewerIsSender(sent.isPresent())
                            .secondsToExpire(secondsToExpire)
                            .build();
                }
            }
            respB.datingInviteSummary(inviteSummary);
        } catch (Exception e) {
            log.debug("dating invite check failed: {}", e.getMessage());
        }
        try {
            List<MemorySummaryResponse> mutualMemories = Collections.emptyList();
            if (viewerId != null && eventService != null) {
                mutualMemories = eventService.findMutualMemories(viewerId, targetId);
            }
            respB.mutualMemories(mutualMemories);
        } catch (Exception e) {
            log.debug("mutual memories fetch failed: {}", e.getMessage());
        }
        if (viewerId != null && viewerId.equals(targetId)) {
            try {
                List<FriendshipResponse> pending = friendshipService.getPendingRequestsForUser(targetId, PageRequest.of(0,10)).getContent();
                respB.privateFriendRequests(pending);
                List<DatingInvite> pendingInvites = datingInviteRepository.findByTargetIdAndStatus(targetId, DatingInviteStatus.PENDING);
                respB.privateDatingInvites(pendingInvites.stream().map(di -> DatingInviteSummary.builder()
                        .inviteId(di.getInviteId())
                        .senderId(di.getSenderId())
                        .targetId(di.getTargetId())
                        .status(di.getStatus())
                        .createdAt(di.getCreatedAt())
                        .expiresAt(di.getExpiresAt())
                        .viewerIsSender(false)
                        .secondsToExpire(di.getExpiresAt() != null ? Math.max(0, Duration.between(OffsetDateTime.now(), di.getExpiresAt()).getSeconds()) : 0)
                        .build()).toList());
            } catch (Exception e) {
                log.debug("private inbox fetch failed: {}", e.getMessage());
            }
        }
        return respB.build();
    }

    @Override
    @Transactional
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
    public User getUserIfExists(UUID userId) {
        return userRepository.findByUserIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    @Override
    public User findByUserId(UUID userId) {
        return userRepository.findByUserIdAndIsDeletedFalse(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    @Transactional
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
            
            user.setAvatarUrl(avatarUrl);
            user = userRepository.saveAndFlush(user);
            return mapUserToResponseWithAllDetails(user);
         } catch (Exception e) {
             throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
         }
    }

    @Override
    @Transactional
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
            user = userRepository.saveAndFlush(user);
            NotificationRequest notificationRequest = NotificationRequest.builder()
                    .userId(id)
                    .title("Native Language Updated")
                    .content("Your native language has been updated to: " + nativeLanguageCode)
                    .type("NATIVE_LANGUAGE_UPDATE")
                    .build();
            notificationService.createNotification(notificationRequest);
            return mapUserToResponseWithAllDetails(user);
        } catch (Exception e) {
            log.error("Error while updating native language for user ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public UserResponse updateCountry(UUID id, Country country) {
        try {
            if (id == null || country == null) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            User user = userRepository.findByUserIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            user.setCountry(country);
            user = userRepository.saveAndFlush(user);
            NotificationRequest notificationRequest = NotificationRequest.builder()
                    .userId(id)
                    .title("Country Updated")
                    .content("Your country has been updated to: " + country.name())
                    .type("COUNTRY_UPDATE")
                    .build();
            notificationService.createNotification(notificationRequest);
            return mapUserToResponseWithAllDetails(user);
        } catch (Exception e) {
            log.error("Error while updating country for user ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public UserResponse updateExp(UUID id, int exp) {
        try {
            if (id == null || exp < 0) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            User user = userRepository.findByUserIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            int oldExp = user.getExp();
            int oldLevel = user.getLevel();
            int newExp = oldExp + exp;
            user.setExp(newExp);
            int newLevel = calculateLevel(newExp);
            if (newLevel > oldLevel) {
                user.setLevel(newLevel);
                NotificationRequest notificationRequest = NotificationRequest.builder()
                        .userId(id)
                        .title("Level Up!")
                        .content("Congratulations! You have reached level " + newLevel + " with " + newExp + " EXP!")
                        .type("LEVEL_UP")
                        .build();
                notificationService.createNotification(notificationRequest);
                notificationService.sendAchievementNotification(id, "Level Up", "You have reached level " + newLevel + "!");
            } else if (exp > 0) {
                NotificationRequest notificationRequest = NotificationRequest.builder()
                        .userId(id)
                        .title("Experience Points Gained")
                        .content("You have gained " + exp + " EXP! Total EXP: " + newExp)
                        .type("EXP_UPDATE")
                        .build();
                notificationService.createNotification(notificationRequest);
            }
            user = userRepository.saveAndFlush(user);
            
            // AUTOMATION: CHECK EXP CHALLENGE
            if (dailyChallengeService != null) {
                dailyChallengeService.updateChallengeProgress(id, ChallengeType.EXP_EARNED, exp);
            }
            
            return mapUserToResponseWithAllDetails(user);
        } catch (Exception e) {
            log.error("Error while updating exp for user ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public UserResponse updateUserAvatar(UUID userId, String tempPath) {
        try {
            if (tempPath == null || tempPath.isBlank()) {
                throw new AppException(ErrorCode.INVALID_REQUEST);
            }
            User user = userRepository.findByUserIdAndIsDeletedFalse(userId)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
            String newFilename = String.format("avatar_%s_%s", timestamp, userId);
            UserMedia committedMedia = storageService.commit(
                    tempPath,
                    newFilename,
                    userId,
                    MediaType.IMAGE
            );
            user.setAvatarUrl(committedMedia.getFileUrl());
            User savedUser = userRepository.saveAndFlush(user);
            NotificationRequest notificationRequest = NotificationRequest.builder()
                    .userId(userId)
                    .title("Avatar Updated")
                    .content("Your profile avatar has been updated successfully.")
                    .type("AVATAR_UPDATE")
                    .build();
            notificationService.createNotification(notificationRequest);
            return mapUserToResponseWithAllDetails(savedUser);
        } catch (Exception e) {
            log.error("Error while updating avatar (Drive flow) for user ID {}: {}", userId, e.getMessage(), e);
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public void updateLastActive(UUID userId) {
        User u = userRepository.findByUserIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        u.setLastActiveAt(OffsetDateTime.now());
        userRepository.saveAndFlush(u);
    }
    
    @Override
    @Transactional
    public UserResponse updateStreakOnActivity(UUID id) {
        try {
            if (id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            
            User user = userRepository.findByUserIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            
            LocalDate today = LocalDate.now();
            int currentStreak = user.getStreak();
            
            Long totalDurationMinutesToday = userLearningActivityRepository.sumDurationMinutesByUserIdAndDate(id, today);
            int minGoal = user.getMinLearningDurationMinutes();
            
            boolean hasHitDailyGoal = totalDurationMinutesToday >= minGoal;
            boolean streakAlreadyUpdatedToday = today.equals(user.getLastStreakCheckDate());
            
            if (hasHitDailyGoal && !streakAlreadyUpdatedToday) {
                user.setStreak(currentStreak + 1);
                user.setLastStreakCheckDate(today);
                user = userRepository.saveAndFlush(user);
                
                NotificationRequest notificationRequest = NotificationRequest.builder()
                        .userId(id)
                        .title("🔥 Chuỗi Streak Tăng " + (currentStreak + 1) + " Ngày!")
                        .content("Tuyệt vời! Bạn đã hoàn thành mục tiêu " + minGoal + " phút học tập hàng ngày.")
                        .type("STREAK_POPUP_SUCCESS")
                        .payload("{\"newStreak\":" + user.getStreak() + "}")
                        .build();
                notificationService.createPushNotification(notificationRequest);
                notificationService.sendStreakRewardNotification(id, currentStreak + 1);
                
                // AUTOMATION: UPDATE STREAK CHALLENGE
                if (dailyChallengeService != null) {
                    dailyChallengeService.updateChallengeProgress(id, ChallengeType.STREAK_MAINTAIN, 1);
                }
                
            } else if (hasHitDailyGoal && streakAlreadyUpdatedToday) {
                log.info("User {} maintained streak today. Total minutes: {}", id, totalDurationMinutesToday);
                
            } else {
                log.info("User {} has not hit daily goal ({} mins). Current minutes: {}", id, minGoal, totalDurationMinutesToday);
            }
            
            // AUTOMATION: UPDATE LEARNING TIME CHALLENGE (Even if streak not hit)
            if (dailyChallengeService != null && totalDurationMinutesToday > 0) {
                // Warning: this updates total minutes. We should potentially just send an increment of 1 if calling from a per-minute job, 
                // but since this method calculates total today, we need careful logic in DailyChallengeService.
                // Assuming updateChallengeProgress takes an increment. 
                // However, without changing the frontend polling/tracking, this is best effort.
            }

            return mapUserToResponseWithAllDetails(user);
            
        } catch (ObjectOptimisticLockingFailureException e) {
            log.error("Optimistic lock failed while updating streak for user ID {}: {}", id, e.getMessage());
            throw new AppException(ErrorCode.CONCURRENT_UPDATE_ERROR);
        } catch (Exception e) {
            log.error("Error while updating streak for user ID {}: {}", id, e.getMessage(), e);
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public void resetStreakIfNoActivity(UUID id) {
        try {
            if (id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            User user = userRepository.findByUserIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
            
            LocalDate yesterday = LocalDate.now().minusDays(1);
            int minGoal = user.getMinLearningDurationMinutes();
            Long totalDurationMinutesYesterday = userLearningActivityRepository.sumDurationMinutesByUserIdAndDate(id, yesterday);
            boolean hasHitDailyGoalYesterday = totalDurationMinutesYesterday >= minGoal;
            
            boolean streakCheckYesterday = yesterday.equals(user.getLastStreakCheckDate());
            if (user.getStreak() > 0 && (!hasHitDailyGoalYesterday || !streakCheckYesterday)) {
                user.setStreak(0);
                user.setLastStreakCheckDate(null);
                user = userRepository.saveAndFlush(user);
                
                NotificationRequest notificationRequest = NotificationRequest.builder()
                        .userId(id)
                        .title("Streak Reset")
                        .content("Chuỗi học tập của bạn đã bị reset về 0 do không hoàn thành mục tiêu " + minGoal + " phút.")
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
            int minGoal = user.getMinLearningDurationMinutes();
            Long totalDurationMinutesToday = userLearningActivityRepository.sumDurationMinutesByUserIdAndDate(id, today);
            boolean hasHitDailyGoal = totalDurationMinutesToday >= minGoal;
            if (!hasHitDailyGoal && user.getStreak() > 0) {
                long minutesRemaining = minGoal - totalDurationMinutesToday;
                
                NotificationRequest notificationRequest = NotificationRequest.builder()
                        .userId(id)
                        .title("Giữ Vững Chuỗi Streak! ⏳")
                        .content("Bạn cần học thêm " + minutesRemaining + " phút để duy trì chuỗi " + user.getStreak() + " ngày!")
                        .type("STREAK_REMINDER")
                        .payload("{\"screen\":\"Learn\"}")
                        .build();
                notificationService.createPushNotification(notificationRequest);
            }
        } catch (Exception e) {
            log.error("Error while sending streak reminder for user ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }
    
    @Override
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

    @Override
    @Transactional
    public void registerFcmToken(NotificationRequest request) {
        if (!userRepository.existsByUserIdAndIsDeletedFalse(request.getUserId())) {
            throw new AppException(ErrorCode.USER_NOT_FOUND);
        }
        if (request.getDeviceId() == null || request.getDeviceId().isBlank()) {
            log.warn("Missing deviceId for user {}", request.getUserId());
            throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
        }
        UUID userId = request.getUserId();
        String fcmToken = request.getFcmToken();
        String deviceId = request.getDeviceId();
        
        Optional<UserFcmToken> tokenConflict = userFcmTokenRepository.findByFcmToken(fcmToken);
        if (tokenConflict.isPresent()) {
            UserFcmToken conflictToken = tokenConflict.get();
            if (!conflictToken.getUserId().equals(userId) || !conflictToken.getDeviceId().equals(deviceId)) {
                userFcmTokenRepository.delete(conflictToken);
                log.warn("Removed conflict FCM token {} from user {}/device {}", 
                    fcmToken, conflictToken.getUserId(), conflictToken.getDeviceId());
            } else {
                log.info("FCM token {} already registered for user {}/device {}. Skipping update.", fcmToken, userId, deviceId);
                return;
            }
        }
        
        Optional<UserFcmToken> existingTokenForDevice = userFcmTokenRepository
                .findByUserIdAndDeviceId(userId, deviceId);
        if (existingTokenForDevice.isPresent()) {
            UserFcmToken token = existingTokenForDevice.get();
            if (!token.getFcmToken().equals(fcmToken)) {
                token.setFcmToken(fcmToken);
                userFcmTokenRepository.saveAndFlush(token);
                log.info("Updated FCM token for user {} on device {}", userId, deviceId);
            } else {
                log.info("FCM token for user {} on device {} is already correct. Skipping update.", userId, deviceId);
            }
        } else {
            UserFcmToken newToken = UserFcmToken.builder()
                    .userId(userId)
                    .fcmToken(fcmToken)
                    .deviceId(deviceId)
                    .build();
            userFcmTokenRepository.saveAndFlush(newToken);
            log.info("Created new FCM token for user {} on new device {}", userId, deviceId);
        }
    }

    @Override
    @Transactional
    public UserResponse updateSetupStatus(UUID id, boolean isFinished) {
        if (id == null) throw new AppException(ErrorCode.INVALID_KEY);
        User user = userRepository.findByUserIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        
        user.setHasFinishedSetup(isFinished);
        user = userRepository.saveAndFlush(user);
        
        return mapUserToResponseWithAllDetails(user);
    }

    @Override
    @Transactional
    public UserResponse updatePlacementTestStatus(UUID id, boolean isDone) {
        if (id == null) throw new AppException(ErrorCode.INVALID_KEY);
        User user = userRepository.findByUserIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        
        user.setHasDonePlacementTest(isDone);
        user = userRepository.saveAndFlush(user);
        return mapUserToResponseWithAllDetails(user);
    }

    @Override
    @Transactional
    public UserResponse trackDailyWelcome(UUID id) {
        if (id == null) throw new AppException(ErrorCode.INVALID_KEY);
        User user = userRepository.findByUserIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        
        user.setLastDailyWelcomeAt(OffsetDateTime.now());
        user = userRepository.saveAndFlush(user);
        
        return mapUserToResponseWithAllDetails(user);
    }

    private boolean isValidUrl(String url) {
        return url != null && (url.startsWith("http://") || url.startsWith("https://")) && url.length() <= 255;
    }

    private int calculateLevel(int exp) {
        return exp / EXP_PER_LEVEL + 1;
    }

    @Override
    public Character3dResponse getCharacter3dByUserId(UUID userId) {
        try {
            User user = userRepository.findByUserIdAndIsDeletedFalse(userId).orElseThrow(()-> new AppException((ErrorCode.USER_NOT_FOUND)));
            if (user.getCharacter3dId() == null) throw new AppException(ErrorCode.CHARACTER3D_NOT_FOUND);
            Character3d character = character3dRepository.findByCharacter3dIdAndIsDeletedFalse(user.getCharacter3dId())
                    .orElseThrow(() -> new AppException(ErrorCode.CHARACTER3D_NOT_FOUND));
            return character3dMapper.toResponse(character);
        } catch (IllegalArgumentException e) {
            throw new AppException(ErrorCode.INVALID_KEY);
        } catch (Exception e) {
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public void changePassword(UUID id, PasswordUpdateRequest request) {
        if (id == null || request == null) throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
        User user = userRepository.findByUserIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        if (user.getPassword() != null && !user.getPassword().isBlank() && request.getCurrentPassword() != null) {
            if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
                throw new AppException(ErrorCode.INCORRECT_PASSWORD);
            }
        } else if (user.getPassword() != null && !user.getPassword().isBlank() && request.getCurrentPassword() == null) {
            throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
        }
        if (request.getNewPassword() == null || request.getNewPassword().length() < 6) {
            throw new AppException(ErrorCode.INVALID_PASSWORD);
        }
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.saveAndFlush(user);
        NotificationRequest notificationRequest = NotificationRequest.builder()
                .userId(id)
                .title("Password Changed")
                .content("Your password has been successfully changed.")
                .type("SECURITY_UPDATE")
                .build();
        notificationService.createNotification(notificationRequest);
    }

    @Override
    @Transactional
    public void deactivateUser(UUID id, int daysToKeep) {
        if (id == null) throw new AppException(ErrorCode.INVALID_KEY);
        User user = userRepository.findByUserIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        if (user.isDeleted()) {
            throw new AppException(ErrorCode.ACCOUNT_ALREADY_DEACTIVATED);
        }
        user.setDeleted(true);
        user.setDeletedAt(OffsetDateTime.now());
        
        userRepository.saveAndFlush(user);
        
        NotificationRequest notificationRequest = NotificationRequest.builder()
                .userId(id)
                .title("Account Deactivated")
                .content("Your account has been deactivated. You have " + daysToKeep + " days to restore it.")
                .type("ACCOUNT_DEACTIVATED")
                .build();
        notificationService.createNotification(notificationRequest);
    }

    @Override
    @Transactional
    public UserResponse restoreUser(UUID id) {
        if (id == null) throw new AppException(ErrorCode.INVALID_KEY);
        
        User user = userRepository.findByUserIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        if (!user.isDeleted()) {
            throw new AppException(ErrorCode.ACCOUNT_NOT_DEACTIVATED);
        }
        if (user.getDeletedAt() != null) {
            OffsetDateTime permanentDeleteTime = user.getDeletedAt().plusDays(30);
            if (OffsetDateTime.now().isAfter(permanentDeleteTime)) {
                throw new AppException(ErrorCode.ACCOUNT_RECOVERY_EXPIRED);
            }
        }
        
        user.setDeleted(false);
        user.setDeletedAt(null);
        user = userRepository.saveAndFlush(user);
        NotificationRequest notificationRequest = NotificationRequest.builder()
                .userId(id)
                .title("Account Restored")
                .content("Your account has been successfully restored.")
                .type("ACCOUNT_RESTORED")
                .build();
        notificationService.createNotification(notificationRequest);
        return mapUserToResponseWithAllDetails(user);
    }

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

    @Transactional
    @Override
    public void admire(UUID senderId, UUID targetId) {
        if (senderId == null || targetId == null) {
            throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
        }
        if (admirationRepository.existsByUserIdAndSenderId(targetId, senderId)) {
            throw new AppException(ErrorCode.ALREADY_EXISTS);
        }

        Admiration a = Admiration.builder()
                .userId(targetId)
                .senderId(senderId)
                .createdAt(OffsetDateTime.now())
                .build();
        admirationRepository.saveAndFlush(a);

        NotificationRequest notificationRequest = NotificationRequest.builder()
                .userId(targetId)
                .title("Bạn vừa được ngưỡng mộ")
                .content("Bạn vừa nhận được một lượt ngưỡng mộ từ người dùng " + senderId)
                .type("ADMIRE")
                .build();

        notificationService.createNotification(notificationRequest);

        try {
            notificationService.createPushNotification(notificationRequest);
        } catch (Exception ex) {
            log.warn("Push notification failed for admire: sender={}, target={}, error={}", senderId, targetId, ex.getMessage());
        }
    }

    private Locale getLocaleByUserId(UUID userId) {
        User user = userRepository.findByUserIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return user.getNativeLanguageCode() != null ? Locale.forLanguageTag(user.getNativeLanguageCode()) : Locale.getDefault();
    }

    @Override
    public UserStatsResponse getUserStats(UUID userId) {
        if (userId == null) throw new AppException(ErrorCode.INVALID_KEY);

        User user = userRepository.findByUserIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        long totalMessages = chatMessageRepository.countMessagesForUser(userId);
        long translationsUsed = chatMessageRepository.countTranslationsForUser(userId);
        long videoCalls = videoCallRepository.countCompletedCallsForUser(userId);
        OffsetDateTime lastActive = user.getLastActiveAt();

        boolean online = false;
        if (lastActive != null) {
            online = lastActive.isAfter(OffsetDateTime.now().minusMinutes(5));
        }

        return UserStatsResponse.builder()
                .userId(userId)
                .totalMessages(totalMessages)
                .translationsUsed(translationsUsed)
                .videoCalls(videoCalls)
                .lastActiveAt(lastActive)
                .online(online)
                .level(user.getLevel())
                .exp(user.getExp())
                .streak(user.getStreak())
                .build();
    }
}