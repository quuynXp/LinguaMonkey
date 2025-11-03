package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.*;
import com.connectJPA.LinguaVietnameseApp.dto.response.*;
import com.connectJPA.LinguaVietnameseApp.entity.*;
import com.connectJPA.LinguaVietnameseApp.entity.id.LeaderboardEntryId;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserCertificateId;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserInterestId;
import com.connectJPA.LinguaVietnameseApp.enums.*;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
import com.connectJPA.LinguaVietnameseApp.grpc.GrpcClientService;
import com.connectJPA.LinguaVietnameseApp.mapper.Character3dMapper;
import com.connectJPA.LinguaVietnameseApp.mapper.UserMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.*;
import com.connectJPA.LinguaVietnameseApp.service.*;
import com.connectJPA.LinguaVietnameseApp.utils.CloudinaryHelper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.RandomStringUtils;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
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
    private final CloudinaryService cloudinaryService;
    private final UserGoalRepository  userGoalRepository;
    private final UserInterestRepository userInterestRepository;
    private final CloudinaryHelper cloudinaryHelper;
    private final LeaderboardEntryService leaderboardEntryService;
    private static final int EXP_PER_LEVEL = 1000;
    private final UserLearningActivityService userLearningActivityService;
    private final UserCertificateRepository userCertificateRepository;
    private final PasswordEncoder  passwordEncoder;
    private final ChatMessageRepository chatMessageRepository;
    private final VideoCallRepository videoCallRepository;
    private final AuthenticationServiceImpl authenticationService;
    private final UserRoleRepository userRoleRepository;
    private final GrpcClientService grpcClientService;
    private final AdmirationRepository admirationRepository;
    private final BadgeService badgeService;
    private final FriendshipService friendshipService;
    private final CourseService courseService;
    private final CoupleService coupleService;
    private final EventService eventService;
    private final DatingInviteRepository datingInviteRepository;
    private final MinioService minioService;

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
        admirationRepository.save(a);

        // Create notification record
        NotificationRequest notificationRequest = NotificationRequest.builder()
                .userId(targetId)
                .title("Bạn vừa được ngưỡng mộ")
                .content("Bạn vừa nhận được một lượt ngưỡng mộ từ người dùng " + senderId)
                .type("ADMIRE")
                .build();

        // persist notification (DB)
        notificationService.createNotification(notificationRequest);

        // push notification (FCM / websocket etc)
        try {
            notificationService.createPushNotification(notificationRequest);
        } catch (Exception ex) {
            // push failing không làm hỏng luồng admire; log để debug
            log.warn("Push notification failed for admire: sender={}, target={}, error={}", senderId, targetId, ex.getMessage());
        }
    }

    private Locale getLocaleByUserId(UUID userId) {
        User user = userRepository.findByUserIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        return user.getNativeLanguageCode() != null ? Locale.forLanguageTag(user.getNativeLanguageCode()) : Locale.getDefault();
    }

    @Override
    public Page<UserResponse> getAllUsers(String email, String fullname, String nickname, Pageable pageable) {
        try {
            if (pageable == null) {
                throw new AppException(ErrorCode.INVALID_PAGEABLE);
            }
            Page<User> users = userRepository.findByEmailContainingAndFullnameContainingAndNicknameContainingAndIsDeletedFalse(email, fullname, nickname, pageable);

            return users.map(user -> {
                UserResponse response = userMapper.toResponse(user);
                int nextLevelExp = user.getLevel() * EXP_PER_LEVEL;
                response.setExpToNextLevel(nextLevelExp);
                return response;
            });
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

            UserResponse response = userMapper.toResponse(user);
            int nextLevelExp = user.getLevel() * EXP_PER_LEVEL;
            response.setExpToNextLevel(nextLevelExp);

            return response;
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
            if (request == null) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }

            if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
                throw new AppException(ErrorCode.INVALID_REQUEST);
            }

            if (userRepository.existsByEmailAndIsDeletedFalse(request.getEmail())) {
                throw new AppException(ErrorCode.EMAIL_ALREADY_EXISTS);
            }

            User user = new User();
            user.setEmail(request.getEmail().trim());

            if (request.getPassword() != null && !request.getPassword().isBlank()) {
                user.setPassword(passwordEncoder.encode(request.getPassword()));
            } else {
                user.setPassword(RandomStringUtils.randomAlphanumeric(12));
            }

            if (request.getNickname() != null) user.setNickname(request.getNickname());
            if (request.getCharacter3dId() != null) user.setCharacter3dId(request.getCharacter3dId());
            if (request.getNativeLanguageCode() != null)
                user.setNativeLanguageCode(request.getNativeLanguageCode().toLowerCase());
            if (request.getCountry() != null) user.setCountry(request.getCountry());
            if (request.getLearningPace() != null) user.setLearningPace(request.getLearningPace());
            if (request.getAgeRange() != null) user.setAgeRange(request.getAgeRange());

            authenticationService.findOrCreateUserAccount(request.getEmail(), request.getFullname(), null, AuthProvider.QUICK_START, request.getEmail());

            user = userRepository.saveAndFlush(user);

            roleService.assignRoleToUser(user.getUserId(), RoleName.STUDENT);

            Leaderboard lb = leaderboardRepository.findLatestByTabAndIsDeletedFalse("global", PageRequest.of(0,1))
                    .stream().findFirst()
                    .orElseThrow(() -> new AppException(ErrorCode.LEADERBOARD_NOT_FOUND));
            leaderboardEntryRepository.save(LeaderboardEntry.builder()
                    .leaderboardEntryId(new LeaderboardEntryId(user.getUserId(), lb.getLeaderboardId()))
                    .user(user)
                    .leaderboard(lb)
                    .build());

            userLearningActivityRepository.save(UserLearningActivity.builder()
                    .userId(user.getUserId())
                    .activityType(ActivityType.START_LEARNING)
                    .build());

            final User savedUser = user;

            if (request.getGoalIds() != null && !request.getGoalIds().isEmpty()) {
                List<UserGoal> userGoals = request.getGoalIds().stream()
                        .filter(Objects::nonNull)
                        .map(goalStr -> {
                            try {
                                return UserGoal.builder()
                                        .userId(savedUser.getUserId())
                                        .goalType(GoalType.valueOf(goalStr))
                                        .build();
                            } catch (IllegalArgumentException ex) {
                                log.warn("Unknown GoalType from request: {}", goalStr);
                                return null;
                            }
                        })
                        .filter(Objects::nonNull)
                        .collect(Collectors.toList());

                if (!userGoals.isEmpty()) userGoalRepository.saveAll(userGoals);
            }

            if (request.getCertificationIds() != null && !request.getCertificationIds().isEmpty()) {
                List<UserCertificate> certs = request.getCertificationIds().stream()
                        .filter(Objects::nonNull)
                        .map(certStr -> {
                            try {
                                return UserCertificate.builder()
                                        .id(new UserCertificateId(savedUser.getUserId(),
                                                Certification.valueOf(certStr).toString()))
                                        .build();
                            } catch (IllegalArgumentException ex) {
                                log.warn("Unknown Certification: {}", certStr);
                                return null;
                            }
                        })
                        .filter(Objects::nonNull)
                        .toList();

                if (!certs.isEmpty()) userCertificateRepository.saveAll(certs);
            }

            if (request.getInterestestIds() != null && !request.getInterestestIds().isEmpty()) {
                List<UserInterest> interests = request.getInterestestIds().stream()
                        .filter(Objects::nonNull)
                        .map(interestId -> UserInterest.builder()
                                .id(new UserInterestId(savedUser.getUserId(), interestId))
                                .user(savedUser)
                                .interest(interestRepository.findById(interestId).orElse(null))
                                .build())
                        .filter(ui -> ui.getInterest() != null)
                        .collect(Collectors.toList());

                if (!interests.isEmpty()) userInterestRepository.saveAll(interests);
            }

            return userMapper.toResponse(user);

        } catch (AppException ae) {
            throw ae;
        } catch (Exception e) {
            log.error("Error while creating user: {}", e.getMessage(), e);
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

            User user = userRepository.findByUserIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

            if (request.getEmail() != null) user.setEmail(request.getEmail());
            if (request.getPassword() != null && !request.getPassword().isBlank()) {
                user.setPassword(passwordEncoder.encode(request.getPassword()));
            }
            if (request.getFullname() != null) user.setFullname(request.getFullname());
            if (request.getNickname() != null) user.setNickname(request.getNickname());
            if (request.getBio() != null) user.setBio(request.getBio());
            if (request.getPhone() != null) user.setPhone(request.getPhone());
            if (request.getAvatarUrl() != null) user.setAvatarUrl(request.getAvatarUrl());
            if (request.getCharacter3dId() != null) user.setCharacter3dId(request.getCharacter3dId());
            if (request.getAgeRange() != null) user.setAgeRange(request.getAgeRange());
            if (request.getLearningPace() != null) user.setLearningPace(request.getLearningPace());
            if (request.getCountry() != null) user.setCountry(request.getCountry());
            if (request.getNativeLanguageCode() != null) user.setNativeLanguageCode(request.getNativeLanguageCode());
            if (request.getProficiency() != null) user.setProficiency(request.getProficiency());
            if (request.getLevel() != null) user.setLevel(request.getLevel());
            if (request.getStreak() != null) user.setStreak(request.getStreak());

            user = userRepository.save(user);
            return userMapper.toResponse(user);
        } catch (Exception e) {
            log.error("Error while updating user ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }


    @Transactional(readOnly = true)
    @Override
    public UserProfileResponse getUserProfile(UUID viewerId, UUID targetId) {
        if (targetId == null) throw new AppException(ErrorCode.INVALID_KEY);

        // 1) load user
        User target = userRepository.findByUserIdAndIsDeletedFalse(targetId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // basic info
        UserProfileResponse.UserProfileResponseBuilder respB = UserProfileResponse.builder()
                .userId(target.getUserId())
                .fullname(target.getFullname())
                .nickname(target.getNickname())
                .avatarUrl(target.getAvatarUrl())
                .country(target.getCountry())
                .level(target.getLevel())
                .exp(target.getExp())
                .bio(target.getBio());

        // flag (you can customize how you return a flag; using country name/code for now)
        if (target.getCountry() != null) {
            respB.flag(target.getCountry().name());
        }

        // character3d
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

        // stats
        try {
            respB.stats(this.getUserStats(targetId));
        } catch (Exception e) {
            log.debug("getUserStats failed for {}: {}", targetId, e.getMessage());
        }

        // badges (assume badgeService.getBadgesForUser)
        try {
            if (badgeService != null) {
                respB.badges(badgeService.getBadgesForUser(targetId));
            }
        } catch (Exception e) {
            log.debug("getBadgesForUser failed: {}", e.getMessage());
        }

        // friend & request status relative to viewer
        boolean isFriend = false;
        FriendRequestStatusResponse friendReqStatus = FriendRequestStatusResponse.builder().status("NONE").build();
        boolean canSendFriendRequest = true;
        boolean canUnfriend = false;
        boolean canBlock = false;

        if (viewerId != null) {
            try {
                isFriend = friendshipService.isFriends(viewerId, targetId);
                friendReqStatus = friendshipService.getFriendRequestStatus(viewerId, targetId);
                canUnfriend = isFriend;
                // assume friendshipService has checks for blocked; else use friendReqStatus
                canBlock = true;
                canSendFriendRequest = !isFriend && (friendReqStatus == null || !"SENT".equals(friendReqStatus.getStatus()));
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

        // admiration
        long admirationCount = admirationRepository.countByUserId(targetId);
        boolean hasAdmired = false;
        if (viewerId != null) {
            hasAdmired = admirationRepository.existsByUserIdAndSenderId(targetId, viewerId);
        }
        respB.admirationCount(admirationCount).hasAdmired(hasAdmired);

        // teacher info: try to detect teacher role and load top courses
        boolean isTeacher = false;
        List<CourseSummaryResponse> teacherCourses = Collections.emptyList();
        try {
            isTeacher = roleService.userHasRole(targetId, RoleName.TEACHER); // adjust if your roleService method name differs
            if (isTeacher && courseService != null) {
                teacherCourses = courseService.getCourseSummariesByTeacher(targetId, 5); // implement service to return CourseSummaryResponse
            }
        } catch (Exception e) {
            log.debug("teacher check or courses load failed: {}", e.getMessage());
        }
        respB.isTeacher(isTeacher).teacherCourses(teacherCourses);

        // leaderboard ranks - try to get from leaderboard snapshot via leaderboardEntryService
        Map<String, Integer> leaderboardRanks = new HashMap<>();
        try {
            // global student
            Integer globalRank = leaderboardEntryService.getRankForUserByTab("global", "student", targetId);
            if (globalRank != null) leaderboardRanks.put("global_student", globalRank);

            // country student
            if (target.getCountry() != null) {
                Integer countryRank = leaderboardEntryService.getRankForUserByTab(target.getCountry().name(), "student", targetId);
                if (countryRank != null) leaderboardRanks.put("country_student", countryRank);
            }

            // teacher rank - optional (depends on implementation)
            Integer teacherRank = leaderboardEntryService.getRankForUserByTab("global", "teacher", targetId);
            if (teacherRank != null) leaderboardRanks.put("teacher", teacherRank);
        } catch (Exception e) {
            log.debug("leaderboard rank fetch failed: {}", e.getMessage());
        }
        respB.leaderboardRanks(leaderboardRanks);

        // couple info (if belongs to couple)
        try {
            CoupleProfileSummary cps = null;
            if (coupleService != null) {
                cps = coupleService.getCoupleProfileSummaryByUser(targetId, viewerId); // implement service method to return CoupleProfileSummary
            }
            respB.coupleProfile(cps);

            // exploring expiring soon flag
            boolean exploringExpiringSoon = false;
            String exploringExpiresInHuman = null;
            if (cps != null && cps.getStatus() != null && cps.getStatus().name().equals("EXPLORING") && cps.getCoupleId() != null) {
                // find couple entity to compute remaining time
                Couple couple = coupleService.findById(cps.getCoupleId());
                if (couple != null && couple.getExploringExpiresAt() != null) {
                    Duration rem = Duration.between(OffsetDateTime.now(), couple.getExploringExpiresAt());
                    long seconds = Math.max(0, rem.getSeconds());
                    long days = seconds / (24*3600);
                    long hours = (seconds % (24*3600)) / 3600;
                    exploringExpiresInHuman = days + " ngày " + hours + " giờ";
                    exploringExpiringSoon = seconds > 0 && seconds <= (2 * 24 * 3600); // < 2 days
                }
            }
            respB.exploringExpiringSoon(exploringExpiringSoon);
            respB.exploringExpiresInHuman(exploringExpiresInHuman);
        } catch (Exception e) {
            log.debug("couple info fetch failed: {}", e.getMessage());
        }

        // dating invite summary between viewer and target (if viewer present)
        try {
            DatingInviteSummary inviteSummary = null;
            if (viewerId != null && datingInviteRepository != null) {
                // check viewer->target
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

        // mutual memories (events) between viewer and target
        try {
            List<MemorySummaryResponse> mutualMemories = Collections.emptyList();
            if (viewerId != null && eventService != null) {
                mutualMemories = eventService.findMutualMemories(viewerId, targetId); // implement to return MemorySummaryResponse list
            }
            respB.mutualMemories(mutualMemories);
        } catch (Exception e) {
            log.debug("mutual memories fetch failed: {}", e.getMessage());
        }

        // if viewer == target add private info (inbox invites etc)
        if (viewerId != null && viewerId.equals(targetId)) {
            try {
                // pending friend requests / invites / inbox summaries
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
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
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
    public UserStatsResponse getUserStats(UUID userId) {
        if (userId == null) throw new AppException(ErrorCode.INVALID_KEY);

        // 1) lấy user để có lastActiveAt, level, exp, streak
        User user = userRepository.findByUserIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // 2) query aggregates (repositories implement these methods)
        long totalMessages = chatMessageRepository.countMessagesForUser(userId);
        long translationsUsed = chatMessageRepository.countTranslationsForUser(userId);
        long videoCalls = videoCallRepository.countCompletedCallsForUser(userId);

        OffsetDateTime lastActive = user.getUpdatedAt();
        // If you store last_active_at as OffsetDateTime in user entity, use that field.

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

    /**
     * Phương thức MỚI: Chỉ nhận URL cuối cùng (từ MinIO) và cập nhật
     */
    @Override
    @Transactional
    public UserResponse updateUserAvatar(UUID userId, String tempPath) {
        try {
            if (tempPath == null || tempPath.isBlank()) {
                throw new AppException(ErrorCode.INVALID_REQUEST);
            }

            User user = userRepository.findByUserIdAndIsDeletedFalse(userId)
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

            // (Tùy chọn: Bạn có thể thêm logic xóa avatar cũ khỏi MinIO ở đây)
            // String oldAvatarUrl = user.getAvatarUrl();
            // if (oldAvatarUrl != null) { ... }

            // 1. Tạo đường dẫn vĩnh viễn mới
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
            // Lấy tên file gốc từ path (bỏ 'temp/' và timestamp)
            String originalFilename = tempPath.substring(tempPath.indexOf("_") + 1);
            String newPath = String.format("users/%s/avatars/%s_%s",
                    userId,
                    timestamp,
                    originalFilename);

            // 2. Gọi MinioService.commit
            // Hàm này sẽ: Di chuyển file (temp -> newPath), Xóa temp, Lưu UserMedia
            UserMedia committedMedia = minioService.commit(
                    tempPath,
                    newPath,
                    userId,
                    MediaType.IMAGE
            );

            // 3. Cập nhật user
            // committedMedia.getFileUrl() đã được set trong MinioServiceImpl
            user.setAvatarUrl(committedMedia.getFileUrl());
            User savedUser = userRepository.save(user);

            // Notification
            NotificationRequest notificationRequest = NotificationRequest.builder()
                    .userId(userId)
                    .title("Avatar Updated")
                    .content("Your profile avatar has been updated successfully.")
                    .type("AVATAR_UPDATE")
                    .build();
            notificationService.createNotification(notificationRequest);

            return userMapper.toResponse(user);
        } catch (Exception e) {
            log.error("Error while updating avatar (MinIO flow) for user ID {}: {}", userId, e.getMessage(), e);
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public void updateLastActive(UUID userId) {
        User u = userRepository.findByUserIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        u.setLastActiveAt(OffsetDateTime.now());
        userRepository.save(u);
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
            if (user.getCharacter3dId() == null) throw new AppException(ErrorCode.CHARACTER3D_NOT_FOUND);

            Character3d character =  character3dRepository.findByCharacter3dIdAndIsDeletedFalse(user.getCharacter3dId())
                    .orElseThrow(() -> new AppException(ErrorCode.CHARACTER3D_NOT_FOUND));

            return character3dMapper.toResponse(character);
        } catch (IllegalArgumentException e) {
            throw new AppException(ErrorCode.INVALID_KEY);
        } catch (Exception e) {
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }
}