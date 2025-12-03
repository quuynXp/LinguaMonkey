package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.CreateCourseRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.PublishVersionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.UpdateCourseDetailsRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.UpdateCourseVersionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseSummaryResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseVersionResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.CreatorDashboardResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Course;
import com.connectJPA.LinguaVietnameseApp.entity.CourseVersion;
import com.connectJPA.LinguaVietnameseApp.entity.CourseVersionEnrollment;
import com.connectJPA.LinguaVietnameseApp.entity.CourseVersionLesson;
import com.connectJPA.LinguaVietnameseApp.entity.Lesson;
import com.connectJPA.LinguaVietnameseApp.entity.Role;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.entity.UserRole;
import com.connectJPA.LinguaVietnameseApp.enums.CourseApprovalStatus;
import com.connectJPA.LinguaVietnameseApp.enums.CourseType;
import com.connectJPA.LinguaVietnameseApp.enums.RoleName;
import com.connectJPA.LinguaVietnameseApp.enums.VersionStatus;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.mapper.CourseMapper;
import com.connectJPA.LinguaVietnameseApp.mapper.CourseVersionMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseVersionEnrollmentRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseVersionLessonRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseVersionRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseVersionReviewRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LessonRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.RoleRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRoleRepository;
import com.connectJPA.LinguaVietnameseApp.service.CourseVersionDiscountService;
import com.connectJPA.LinguaVietnameseApp.service.CourseVersionEnrollmentService;
import com.connectJPA.LinguaVietnameseApp.service.CourseService;
import com.connectJPA.LinguaVietnameseApp.service.NotificationService;
import com.connectJPA.LinguaVietnameseApp.service.RoomService;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CourseServiceImpl implements CourseService {

    private final CourseRepository courseRepository;
    private final CourseVersionRepository courseVersionRepository;
    private final CourseVersionLessonRepository cvlRepository;
    private final CourseVersionEnrollmentRepository courseEnrollmentRepository;
    private final CourseVersionReviewRepository courseReviewRepository;
    private final LessonRepository lessonRepository;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final RoleRepository roleRepository;
    private final RoomService roomService;

    private final CourseMapper courseMapper;
    private final CourseVersionMapper versionMapper;

    private final CourseVersionDiscountService courseVersionDiscountService;
    private final CourseVersionEnrollmentService courseEnrollmentService;
    private final NotificationService notificationService;

    private static final List<String> CEFR_LEVELS = Arrays.asList("A1", "A2", "B1", "B2", "C1", "C2");

    private CourseResponse enrichCourseResponse(CourseResponse response) {
        if (response != null && response.getCourseId() != null) {
            if (response.getCreatorId() != null) {
                try {
                    UUID creatorId = response.getCreatorId();
                    User creator = userRepository.findById(creatorId).orElse(null);
                    if (creator != null) {
                        response.setCreatorName(creator.getFullname() != null ? creator.getFullname() : creator.getNickname());
                        response.setCreatorAvatar(creator.getAvatarUrl());
                        
                        response.setCreatorNickname(creator.getNickname());
                        response.setCreatorCountry(creator.getCountry());
                        response.setCreatorVip(creator.isVip());
                        response.setCreatorLevel(creator.getLevel());
                    }
                } catch (IllegalArgumentException e) {
                }
            }

            try {
                Double avgRating = courseReviewRepository.getAverageRatingByCourseId(response.getCourseId());
                long count = courseReviewRepository.countByCourseIdAndParentIsNullAndIsDeletedFalse(response.getCourseId());
                
                response.setAverageRating(avgRating != null ? avgRating : 0.0);
                response.setReviewCount((int) count);
            } catch (Exception e) {
                response.setAverageRating(0.0);
                response.setReviewCount(0);
            }
        }
        return response;
    }

    // --- Existing Creator Stats (Preserved) ---
    public CreatorDashboardResponse getCreatorDashboardStats(UUID creatorId) {
        if (!userRepository.existsById(creatorId)) {
            throw new AppException(ErrorCode.USER_NOT_FOUND);
        }

        long totalStudents = courseEnrollmentRepository.countStudentsByCreatorId(creatorId);
        long totalReviews = courseReviewRepository.countByCreatorId(creatorId);
        Double avgRatingVal = courseReviewRepository.getAverageRatingByCreatorId(creatorId);
        double averageRating = avgRatingVal != null ? avgRatingVal : 0.0;

        return calculateDashboardMetrics(creatorId, totalStudents, totalReviews, averageRating, true);
    }

    // --- New Method for Specific Course Stats ---
    public CreatorDashboardResponse getCourseDashboardStats(UUID courseId) {
        if (!courseRepository.existsById(courseId)) {
            throw new AppException(ErrorCode.COURSE_NOT_FOUND);
        }

        long totalStudents = courseEnrollmentRepository.countStudentsByCourseId(courseId);
        long totalReviews = courseReviewRepository.countByCourseIdAndParentIsNullAndIsDeletedFalse(courseId);
        Double avgRatingVal = courseReviewRepository.getAverageRatingByCourseId(courseId);
        double averageRating = avgRatingVal != null ? avgRatingVal : 0.0;

        return calculateDashboardMetrics(courseId, totalStudents, totalReviews, averageRating, false);
    }

    // Helper to avoid duplicating date logic
    private CreatorDashboardResponse calculateDashboardMetrics(UUID id, long students, long reviews, double rating, boolean isCreatorContext) {
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime startOfDay = now.withHour(0).withMinute(0).withSecond(0).withNano(0);
        OffsetDateTime startOfWeek = now.minusDays(now.getDayOfWeek().getValue() - 1).withHour(0).withMinute(0).withSecond(0).withNano(0);
        OffsetDateTime startOfMonth = now.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
        OffsetDateTime startOfYear = now.withDayOfYear(1).withHour(0).withMinute(0).withSecond(0).withNano(0);

        BigDecimal revenueToday, revenueWeek, revenueMonth, revenueYear;

        if (isCreatorContext) {
            revenueToday = courseEnrollmentRepository.sumRevenueByCreatorIdAndDateRange(id, startOfDay, now);
            revenueWeek = courseEnrollmentRepository.sumRevenueByCreatorIdAndDateRange(id, startOfWeek, now);
            revenueMonth = courseEnrollmentRepository.sumRevenueByCreatorIdAndDateRange(id, startOfMonth, now);
            revenueYear = courseEnrollmentRepository.sumRevenueByCreatorIdAndDateRange(id, startOfYear, now);
        } else {
            revenueToday = courseEnrollmentRepository.sumRevenueByCourseIdAndDateRange(id, startOfDay, now);
            revenueWeek = courseEnrollmentRepository.sumRevenueByCourseIdAndDateRange(id, startOfWeek, now);
            revenueMonth = courseEnrollmentRepository.sumRevenueByCourseIdAndDateRange(id, startOfMonth, now);
            revenueYear = courseEnrollmentRepository.sumRevenueByCourseIdAndDateRange(id, startOfYear, now);
        }

        List<CreatorDashboardResponse.ChartDataPoint> chartData = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM");
        
        for (int i = 6; i >= 0; i--) {
            OffsetDateTime dayStart = now.minusDays(i).withHour(0).withMinute(0).withSecond(0).withNano(0);
            OffsetDateTime dayEnd = dayStart.plusDays(1).minusNanos(1);
            
            BigDecimal dailyRev;
            if (isCreatorContext) {
                dailyRev = courseEnrollmentRepository.sumRevenueByCreatorIdAndDateRange(id, dayStart, dayEnd);
            } else {
                dailyRev = courseEnrollmentRepository.sumRevenueByCourseIdAndDateRange(id, dayStart, dayEnd);
            }
            chartData.add(new CreatorDashboardResponse.ChartDataPoint(dayStart.format(formatter), dailyRev));
        }

        return CreatorDashboardResponse.builder()
                .totalStudents(students)
                .totalReviews(reviews)
                .averageRating(rating)
                .revenueToday(revenueToday)
                .revenueWeek(revenueWeek)
                .revenueMonth(revenueMonth)
                .revenueYear(revenueYear)
                .revenueChart(chartData)
                .build();
    }

    @Override
    public Page<Course> searchCourses(String keyword, int page, int size, Map<String, Object> filters) {
        if (keyword == null || keyword.isBlank()) {
            return Page.empty();
        }
        try {
            Pageable pageable = PageRequest.of(page, size);
            return courseRepository.searchCoursesByKeyword(keyword, pageable);
        } catch (Exception e) {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }
    }

    @Override
    @Transactional
    public CourseResponse createCourse(CreateCourseRequest request) {
        User creator = userRepository.findByUserIdAndIsDeletedFalse(request.getCreatorId())
                .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST));

        Course course = new Course();
        course.setTitle(request.getTitle());
        course.setCreatorId(request.getCreatorId());
        course.getLatestPublicVersion().setPrice(request.getPrice());
        course.setApprovalStatus(CourseApprovalStatus.PENDING);
        course = courseRepository.save(course);

        // Create first Version (Draft v1)
        CourseVersion version = new CourseVersion();
        version.setCourse(course);
        version.setVersionNumber(1);
        version.setStatus(VersionStatus.DRAFT);
        version.setIsIntegrityValid(null);
        version.setIsContentValid(null);
        
        courseVersionRepository.save(version);

        return enrichCourseResponse(courseMapper.toResponse(course));
    }

    @Override
    @Transactional
    public CourseVersionResponse updateCourseVersion(UUID versionId, UpdateCourseVersionRequest request) {
        CourseVersion version = courseVersionRepository.findByVersionIdAndStatus(versionId, VersionStatus.DRAFT)
                .orElseThrow(() -> new AppException(ErrorCode.VERSION_NOT_FOUND_OR_NOT_DRAFT));

        User creator = userRepository.findById(version.getCourse().getCreatorId())
                .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST));

        // 1. Update Basic Info
        if (request.getDescription() != null) version.setDescription(request.getDescription());
        if (request.getThumbnailUrl() != null) version.setThumbnailUrl(request.getThumbnailUrl());
        if (request.getPrice() != null) version.setPrice(request.getPrice());
        if (request.getLanguageCode() != null) version.setLanguageCode(request.getLanguageCode());
        if (request.getDifficultyLevel() != null) version.setDifficultyLevel(request.getDifficultyLevel());
        if (request.getCategoryCode() != null) version.setCategoryCode(request.getCategoryCode());

        // 2. Update Lessons & Order
        if (request.getLessonIds() != null) {
            // Clear existing relationships
            if (version.getLessons() != null) {
                version.getLessons().clear();
            } else {
                version.setLessons(new ArrayList<>());
            }
            
            // Re-add based on the ordered list
            int order = 0;
            for (UUID lessonId : request.getLessonIds()) {
                Lesson lesson = lessonRepository.findById(lessonId)
                        .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));

                // Security check: Lesson must belong to the same creator
                if (!lesson.getCreatorId().equals(creator.getUserId())) {
                    throw new AppException(ErrorCode.UNAUTHORIZED);
                }

                CourseVersionLesson cvl = new CourseVersionLesson(version, lesson, order++);
                version.getLessons().add(cvl);
            }
        }

        // Reset validation status on content change
        version.setIsIntegrityValid(null);
        version.setIsContentValid(null);
        version.setValidationWarnings(null);

        version = courseVersionRepository.save(version);
        return versionMapper.toResponse(version);
    }

    @Override
    @Transactional
    public CourseVersionResponse publishCourseVersion(UUID versionId, PublishVersionRequest request) {
        CourseVersion version = courseVersionRepository.findByVersionIdAndStatus(versionId, VersionStatus.DRAFT)
                .orElseThrow(() -> new AppException(ErrorCode.VERSION_NOT_FOUND_OR_NOT_DRAFT));

        Course course = version.getCourse();

        if (Boolean.FALSE.equals(version.getIsIntegrityValid()) || Boolean.FALSE.equals(version.getIsContentValid())) {
            throw new AppException(ErrorCode.COURSE_VALIDATION_FAILED);
        }
        
        if (version.getIsIntegrityValid() == null || version.getIsContentValid() == null) {
            throw new AppException(ErrorCode.COURSE_VALIDATION_PENDING);
        }

        if (version.getDescription() == null || version.getDescription().length() < 20) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }
        if (version.getThumbnailUrl() == null || version.getThumbnailUrl().isBlank()) {
             throw new AppException(ErrorCode.INVALID_REQUEST);
        }
        if (version.getLessons() == null || version.getLessons().isEmpty()) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }
        if (course.getLatestPublicVersion().getPrice() != null && course.getLatestPublicVersion().getPrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        version.setReasonForChange(request.getReasonForChange());
        boolean requiresAdminApproval = false;

        if (course.getLatestPublicVersion().getPrice() != null && course.getLatestPublicVersion().getPrice().compareTo(BigDecimal.ZERO) > 0) {
            requiresAdminApproval = true;
        }

        if (version.getVersionNumber() > 1) {
            CourseVersion previousVersion = courseVersionRepository.findLatestPublicVersionByCourseId(course.getCourseId())
                    .orElse(null);
            if (isMajorChange(version, previousVersion)) {
                requiresAdminApproval = true;
            }
        }

        if (requiresAdminApproval) {
            version.setStatus(VersionStatus.PENDING_APPROVAL);
            sendAdminNotification(
                    "Course Approval Request",
                    "The course '" + course.getTitle() + "' (v" + version.getVersionNumber() + ") requires approval. Price: " + course.getLatestPublicVersion().getPrice(),
                    "COURSE_APPROVAL_PENDING"
            );
        } else {
            version.setStatus(VersionStatus.PUBLIC);
            version.setPublishedAt(OffsetDateTime.now());
            course.setLatestPublicVersion(version);
            course.setApprovalStatus(CourseApprovalStatus.APPROVED);
            courseRepository.save(course);

            sendLearnerUpdateNotification(
                    course,
                    version,
                    "A new version (v" + version.getVersionNumber() + ") is available. Reason: " + version.getReasonForChange()
            );
        }

        version = courseVersionRepository.save(version);
        return versionMapper.toResponse(version);
    }

    @Override
    @Transactional
    public CourseVersionResponse createNewDraftVersion(UUID courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_FOUND));

        boolean draftExists = courseVersionRepository.existsByCourse_CourseIdAndStatus(courseId, VersionStatus.DRAFT);
        if (draftExists) {
            throw new AppException(ErrorCode.COURSE_HAS_DRAFT_ALREADY);
        }

        CourseVersion publicVersion = course.getLatestPublicVersion();
        
        int nextVerNum = (publicVersion == null) ? 1 : publicVersion.getVersionNumber() + 1;

        CourseVersion newDraft = new CourseVersion();
        newDraft.setCourse(course);
        newDraft.setVersionNumber(nextVerNum);
        newDraft.setStatus(VersionStatus.DRAFT);
        newDraft.setIsIntegrityValid(null);
        newDraft.setIsContentValid(null);
        
        if (publicVersion != null) {
            newDraft.setDescription(publicVersion.getDescription());
            newDraft.setThumbnailUrl(publicVersion.getThumbnailUrl());
            newDraft.setLessons(new ArrayList<>());
            List<CourseVersionLesson> oldLessons = cvlRepository.findByCourseVersion_VersionIdOrderByOrderIndex(publicVersion.getVersionId());
            for (CourseVersionLesson oldCvl : oldLessons) {
                CourseVersionLesson newCvl = new CourseVersionLesson(newDraft, oldCvl.getLesson(), oldCvl.getOrderIndex());
                newDraft.getLessons().add(newCvl);
            }
        } else {
             newDraft.setLessons(new ArrayList<>());
        }

        newDraft = courseVersionRepository.save(newDraft);
        return versionMapper.toResponse(newDraft);
    }

    @Override
    @Transactional
    public CourseResponse updateCourseDetails(UUID id, UpdateCourseDetailsRequest request) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_FOUND));

        if (request.getTitle() != null) {
            course.setTitle(request.getTitle());
        }
        course = courseRepository.save(course);
        return enrichCourseResponse(courseMapper.toResponse(course));
    }

    private boolean isMajorChange(CourseVersion newVersion, CourseVersion oldVersion) {
        if (oldVersion == null) {
            return false;
        }

        Set<UUID> oldLessonIds = cvlRepository.findByCourseVersion_VersionIdOrderByOrderIndex(oldVersion.getVersionId())
                .stream()
                .map(cvl -> cvl.getLesson().getLessonId())
                .collect(Collectors.toSet());

        Set<UUID> newLessonIds = newVersion.getLessons().stream()
                .map(cvl -> cvl.getLesson().getLessonId())
                .collect(Collectors.toSet());

        long lessonsAdded = newLessonIds.stream().filter(id -> !oldLessonIds.contains(id)).count();
        long lessonsRemoved = oldLessonIds.stream().filter(id -> !newLessonIds.contains(id)).count();
        long totalChanges = lessonsAdded + lessonsRemoved;

        int oldSize = oldLessonIds.size();
        if (oldSize == 0) return newLessonIds.size() > 0;

        double changePercentage = (double) totalChanges / oldSize;
        return changePercentage > 0.3;
    }

    private void sendAdminNotification(String title, String content, String type) {
        Role adminRole = roleRepository.findByRoleNameAndIsDeletedFalse(RoleName.ADMIN)
                .orElse(null);
        if (adminRole != null) {
            List<UserRole> adminUserRoles = userRoleRepository.findById_RoleId(adminRole.getRoleId());
            for (UserRole userRole : adminUserRoles) {
                NotificationRequest adminNotif = NotificationRequest.builder()
                        .userId(userRole.getId().getUserId())
                        .title(title)
                        .content(content)
                        .type(type)
                        .build();
                notificationService.createPushNotification(adminNotif);
            }
        }
    }

    private void sendLearnerUpdateNotification(Course course, CourseVersion version, String content) {
        List<CourseVersionEnrollment> enrollments = courseEnrollmentRepository.findByCourseVersion_Course_CourseIdAndIsDeletedFalse(course.getCourseId());
        for (CourseVersionEnrollment enrollment : enrollments) {
            if (enrollment.getCourseVersion().getVersionId() != null && !enrollment.getCourseVersion().getVersionId().equals(version.getVersionId())) {
                NotificationRequest learnerNotif = NotificationRequest.builder()
                        .userId(enrollment.getUserId())
                        .title("Course Updated: " + course.getTitle())
                        .content(content)
                        .type("COURSE_VERSION_UPDATE")
                        .build();
                notificationService.createPushNotification(learnerNotif);
            }
        }
    }

    @Override
    public Page<CourseResponse> getAllCourses(String title, String languageCode, CourseType type, Boolean isAdminCreated, Pageable pageable) {
        Page<Course> courses;

        if (Boolean.TRUE.equals(isAdminCreated)) {
            courses = courseRepository.findByIsAdminCreatedTrueAndApprovalStatusAndIsDeletedFalse(
                    CourseApprovalStatus.APPROVED, pageable);
        } else if (type != null) {
            courses = courseRepository.findByTypeAndApprovalStatusAndIsDeletedFalse(type, CourseApprovalStatus.APPROVED, pageable);
        } else {
            courses = courseRepository.findByTitleContainingIgnoreCaseAndLanguageCodeAndApprovalStatusAndIsDeletedFalse(
                    title, languageCode, CourseApprovalStatus.APPROVED, pageable);
        }
        return courses.map(courseMapper::toResponse).map(this::enrichCourseResponse);
    }

    @Override
    public List<CourseResponse> getRecommendedCourses(UUID userId, int limit) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        List<CourseVersionEnrollment> enrollments = courseEnrollmentRepository.findByUserId(userId);
        List<UUID> enrolledCourseIds = enrollments.stream()
                .map(enrollment -> {
                    if (enrollment.getCourseVersion() != null && enrollment.getCourseVersion().getCourse() != null) {
                        return enrollment.getCourseVersion().getCourse().getCourseId();
                    }
                    return null;
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        if (enrolledCourseIds.isEmpty()) {
            enrolledCourseIds.add(UUID.fromString("00000000-0000-0000-0000-000000000000"));
        }

        List<Course> recommendedCourses = new ArrayList<>();
        Pageable pageable = PageRequest.of(0, limit);

        if (user.getProficiency() != null) {
            String userLevel = user.getProficiency().name();
            List<String> targetLevels = getNeighborLevels(userLevel);

            Page<Course> levelCourses = courseRepository.findByDifficultyLevelInAndCourseIdNotInAndApprovalStatusAndIsDeletedFalse(
                    targetLevels,
                    enrolledCourseIds,
                    CourseApprovalStatus.APPROVED,
                    pageable
            );
            recommendedCourses.addAll(levelCourses.getContent());
        }

        if (recommendedCourses.isEmpty()) {
            Page<Course> fallbackCourses = courseRepository.findByCourseIdNotInAndApprovalStatusAndIsDeletedFalse(
                    enrolledCourseIds,
                    CourseApprovalStatus.APPROVED,
                    pageable
            );
            recommendedCourses.addAll(fallbackCourses.getContent());
        }

        return recommendedCourses.stream()
                .map(courseMapper::toResponse)
                .map(this::enrichCourseResponse)
                .collect(Collectors.toList());
    }

    private List<String> getNeighborLevels(String currentLevel) {
        int index = CEFR_LEVELS.indexOf(currentLevel);
        if (index == -1) return Collections.singletonList(currentLevel);

        List<String> neighbors = new ArrayList<>();
        if (index > 0) neighbors.add(CEFR_LEVELS.get(index - 1));
        neighbors.add(currentLevel);
        if (index < CEFR_LEVELS.size() - 1) neighbors.add(CEFR_LEVELS.get(index + 1));
        
        return neighbors;
    }

    @Override
    public List<CourseSummaryResponse> getCourseSummariesByTeacher(UUID teacherId, int limit) {
        List<Course> courses = courseRepository.findByCreatorIdAndIsDeletedFalse(teacherId);
        return courses.stream()
                .map(c -> new CourseSummaryResponse(c.getCourseId(), c.getTitle()))
                .collect(Collectors.toList());
    }

    @Override
    public CourseResponse getCourseById(UUID id) {
        Course course = courseRepository
                .findByCourseIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_FOUND));
        return enrichCourseResponse(courseMapper.toResponse(course));
    }

    @Override
    @Transactional
    public void deleteCourse(UUID id) {
        Course course = courseRepository
                .findByCourseIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_FOUND));
        course.setDeleted(true);
        courseRepository.save(course);

        // Delete discounts and enrollments
        courseVersionDiscountService.deleteDiscountsByCourseId(id);
        courseEnrollmentService.deleteCourseVersionEnrollmentsByCourseId(id);
    }

    @Override
    public Page<CourseResponse> getEnrolledCoursesByUserId(UUID userId, Pageable pageable) {
        Page<CourseVersionEnrollment> enrollments = courseEnrollmentRepository.findByUserId(userId, pageable);
        return enrollments.map(enrollment -> {
            Course course = enrollment.getCourseVersion().getCourse();
            if (course == null) {
                throw new AppException(ErrorCode.COURSE_NOT_FOUND);
            }
            return enrichCourseResponse(courseMapper.toResponse(course));
        });
    }

    @Override
    public Page<CourseResponse> getCoursesByCreator(UUID creatorId, Pageable pageable) {
        Page<Course> courses = courseRepository.findByCreatorIdAndIsDeletedFalse(creatorId, pageable);
        return courses.map(courseMapper::toResponse).map(this::enrichCourseResponse);
    }

    @Override
    @Transactional
    public CourseVersionResponse approveCourseVersion(UUID versionId) {
        CourseVersion version = courseVersionRepository.findByVersionIdAndStatus(versionId, VersionStatus.PENDING_APPROVAL)
                .orElseThrow(() -> new AppException(ErrorCode.VERSION_NOT_FOUND_OR_NOT_DRAFT));

        Course course = version.getCourse();

        if (course.getLatestPublicVersion() != null) {
            CourseVersion oldPublic = course.getLatestPublicVersion();
            oldPublic.setStatus(VersionStatus.ARCHIVED);
            courseVersionRepository.save(oldPublic);
        }

        version.setStatus(VersionStatus.PUBLIC);
        version.setPublishedAt(OffsetDateTime.now());

        course.setLatestPublicVersion(version);
        course.setApprovalStatus(CourseApprovalStatus.APPROVED);
        courseRepository.save(course);
        version = courseVersionRepository.save(version);
        
        roomService.ensureCourseRoomExists(course.getCourseId(), course.getTitle(), course.getCreatorId());

        NotificationRequest creatorNotif = NotificationRequest.builder()
                .userId(course.getCreatorId())
                .title("Course Version Approved")
                .content("Your new version (v" + version.getVersionNumber() + ") for '" + course.getTitle() + "' has been approved and is now public.")
                .type("COURSE_APPROVAL_SUCCESS")
                .build();
        notificationService.createPushNotification(creatorNotif);

        sendLearnerUpdateNotification(
                course,
                version,
                "A new version (v" + version.getVersionNumber() + ") is available. Reason: " + version.getReasonForChange()
        );

        return versionMapper.toResponse(version);
    }

    @Override
    @Transactional
    public CourseVersionResponse rejectCourseVersion(UUID versionId, String reason) {
        CourseVersion version = courseVersionRepository.findByVersionIdAndStatus(versionId, VersionStatus.PENDING_APPROVAL)
                .orElseThrow(() -> new AppException(ErrorCode.VERSION_NOT_FOUND_OR_NOT_DRAFT));

        version.setStatus(VersionStatus.DRAFT);
        version = courseVersionRepository.save(version);

        NotificationRequest creatorNotif = NotificationRequest.builder()
                .userId(version.getCourse().getCreatorId())
                .title("Course Version Rejected")
                .content("Your new version (v" + version.getVersionNumber() + ") for '" + version.getCourse().getTitle() + "' was rejected. Reason: " + (reason != null ? reason : "Not specified"))
                .type("COURSE_APPROVAL_REJECTED")
                .build();
        notificationService.createPushNotification(creatorNotif);

        return versionMapper.toResponse(version);
    }

    @Override
    public List<String> getCourseCategories() {
        return Arrays.stream(CourseType.values())
                .map(CourseType::name)
                .collect(Collectors.toList());
    }
}