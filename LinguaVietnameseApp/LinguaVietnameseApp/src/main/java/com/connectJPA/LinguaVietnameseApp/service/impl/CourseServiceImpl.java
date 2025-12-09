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
import com.connectJPA.LinguaVietnameseApp.entity.CourseVersionDiscount;
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
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseVersionDiscountRepository;
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
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
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
    private final CourseVersionDiscountRepository discountRepository;
    private final CourseVersionMapper courseVersionMapper;

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
                long studentCount = courseEnrollmentRepository.countStudentsByCourseId(response.getCourseId());
                response.setAverageRating(avgRating != null ? avgRating : 0.0);
                response.setReviewCount((int) count);
                response.setTotalStudents((int) studentCount);
            } catch (Exception e) {
            }

            courseVersionRepository.findByCourseIdAndStatusAndIsDeletedFalse(response.getCourseId(), VersionStatus.DRAFT)
                    .stream()
                    .findFirst()
                    .ifPresent(draft -> response.setLatestDraftVersion(versionMapper.toResponse(draft)));
        }
        return response;
    }


    @Override
    public CourseVersionResponse getCourseVersionById(UUID versionId) {
        CourseVersion version = courseVersionRepository.findById(versionId)
                .orElseThrow(() -> new AppException(ErrorCode.VERSION_NOT_FOUND));
        return versionMapper.toResponse(version);
    }

    @Override
    public List<CourseResponse> getTopSellingCourses(int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        List<Course> courses = courseRepository.findTopSellingCourses(pageable);
        return courses.stream()
                .map(courseMapper::toResponse)
                .map(this::enrichCourseResponse)
                .collect(Collectors.toList());
    }

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
        
        // Changed: Defaults to APPROVED to allow immediate publishing without admin intervention
        course.setApprovalStatus(CourseApprovalStatus.APPROVED);
        course = courseRepository.save(course); 

        // Create first Version (Draft v1)
        CourseVersion version = new CourseVersion();
        version.setCourseId(course.getCourseId());
        version.setVersionNumber(1);
        version.setStatus(VersionStatus.DRAFT);
        version.setIsIntegrityValid(null);
        version.setIsContentValid(null);
        version.setPrice(request.getPrice()); 
        
        courseVersionRepository.save(version);
        
        return enrichCourseResponse(courseMapper.toResponse(course));
    }

    @Override
    @Transactional
    public CourseVersionResponse updateCourseVersion(UUID versionId, UpdateCourseVersionRequest request) {
        CourseVersion version = courseVersionRepository.findByVersionIdAndStatus(versionId, VersionStatus.DRAFT)
                .orElseThrow(() -> new AppException(ErrorCode.VERSION_NOT_FOUND_OR_NOT_DRAFT));

        Course course = courseRepository.findById(version.getCourseId())
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_FOUND));

        User creator = userRepository.findById(course.getCreatorId())
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
            if (version.getLessons() != null) {
                version.getLessons().clear();
            } else {
                version.setLessons(new ArrayList<>());
            }
            
            int order = 0;
            for (UUID lessonId : request.getLessonIds()) {
                Lesson lesson = lessonRepository.findById(lessonId)
                        .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));

                if (!lesson.getCreatorId().equals(creator.getUserId())) {
                    throw new AppException(ErrorCode.UNAUTHORIZED);
                }

                CourseVersionLesson cvl = new CourseVersionLesson(version, lesson, order++);
                version.getLessons().add(cvl);
            }
        }

        boolean isValid = true;
        
        if (version.getDescription() == null ) isValid = false;
        if (version.getThumbnailUrl() == null || version.getThumbnailUrl().isBlank()) isValid = false;
        if (version.getLessons() == null || version.getLessons().isEmpty()) isValid = false;
        if (version.getPrice() != null && version.getPrice().compareTo(BigDecimal.ZERO) < 0) isValid = false;

        if (isValid) {
            version.setIsContentValid(true);
            version.setIsIntegrityValid(true);
            version.setValidationWarnings(null);
        } else {
            version.setIsContentValid(false);
            version.setIsIntegrityValid(false);
        }

        version = courseVersionRepository.save(version);
        return versionMapper.toResponse(version);
    }

    @Override
    @Transactional
    public CourseVersionResponse publishCourseVersion(UUID versionId, PublishVersionRequest request) {
        CourseVersion version = courseVersionRepository.findByVersionIdAndStatus(versionId, VersionStatus.DRAFT)
                .orElseThrow(() -> new AppException(ErrorCode.VERSION_NOT_FOUND_OR_NOT_DRAFT));

        Course course = courseRepository.findById(version.getCourseId())
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_FOUND));

        // Re-validate one last time to be safe
        if (version.getDescription() == null || version.getDescription().length() < 20 ||
            version.getThumbnailUrl() == null || version.getThumbnailUrl().isBlank() ||
            version.getLessons() == null || version.getLessons().isEmpty()) {
             throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        if (Boolean.FALSE.equals(version.getIsIntegrityValid()) || Boolean.FALSE.equals(version.getIsContentValid())) {
            throw new AppException(ErrorCode.COURSE_VALIDATION_FAILED);
        }

        version.setReasonForChange(request.getReasonForChange());
        
        // Changed: Removed logic for PENDING_APPROVAL based on price/changes.
        // All publish requests now go directly to PUBLIC.
        
        // Archive old version if exists
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

        sendLearnerUpdateNotification(
                course,
                version,
                "A new version (v" + version.getVersionNumber() + ") is available. Update notes: " + version.getReasonForChange()
        );

        version = courseVersionRepository.save(version);
        return versionMapper.toResponse(version);
    }

    @Override
    @Transactional
    public CourseVersionResponse createNewDraftVersion(UUID courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_FOUND));

        boolean draftExists = courseVersionRepository.existsByCourseIdAndStatus(courseId, VersionStatus.DRAFT);
        if (draftExists) {
            throw new AppException(ErrorCode.COURSE_HAS_DRAFT_ALREADY);
        }

        CourseVersion publicVersion = course.getLatestPublicVersion();
        
        int nextVerNum = (publicVersion == null) ? 1 : publicVersion.getVersionNumber() + 1;

        CourseVersion newDraft = new CourseVersion();
        newDraft.setCourseId(course.getCourseId());
        newDraft.setVersionNumber(nextVerNum);
        newDraft.setStatus(VersionStatus.DRAFT);
        newDraft.setIsIntegrityValid(null);
        newDraft.setIsContentValid(null);
        
        if (publicVersion != null) {
            newDraft.setDescription(publicVersion.getDescription());
            newDraft.setThumbnailUrl(publicVersion.getThumbnailUrl());
            newDraft.setPrice(publicVersion.getPrice());
            newDraft.setLanguageCode(publicVersion.getLanguageCode());
            newDraft.setDifficultyLevel(publicVersion.getDifficultyLevel());
            newDraft.setCategoryCode(publicVersion.getCategoryCode());
            
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
        List<CourseVersionEnrollment> enrollments = courseEnrollmentRepository.findByCourseVersion_CourseIdAndIsDeletedFalse(course.getCourseId());
        
        for (CourseVersionEnrollment enrollment : enrollments) {
            if (enrollment.getCourseVersion().getVersionId() != null && !enrollment.getCourseVersion().getVersionId().equals(version.getVersionId())) {
                NotificationRequest learnerNotif = NotificationRequest.builder()
                        .userId(enrollment.getUserId())
                        .title("Course Updated: " + course.getTitle())
                        .content(content)
                        .type("COURSE_VERSION_UPDATE")
                        .additionalData(Map.of("courseId", course.getCourseId().toString(), "versionId", version.getVersionId().toString()))
                        .build();
                notificationService.createPushNotification(learnerNotif);
            }
        }
    }

    @Override
    public Page<CourseResponse> getAllCourses(String title, String languageCode, CourseType type, Boolean isAdminCreated, Pageable pageable) {
        Page<Course> courses;

        if (isAdminCreated != null && isAdminCreated) {
            courses = courseRepository.findByIsAdminCreatedTrueAndApprovalStatusAndIsDeletedFalse(
                    CourseApprovalStatus.APPROVED, pageable
            );
        } 
        else if (title != null && !title.isBlank()) {
            courses = courseRepository.searchCoursesByKeyword(title, pageable);
        } 
        else if (type != null) {
            courses = courseRepository.findByTypeAndApprovalStatusAndIsDeletedFalse(type, CourseApprovalStatus.APPROVED, pageable);
        } 
        else {
            courses = courseRepository.findByApprovalStatusAndIsDeletedFalse(CourseApprovalStatus.APPROVED, pageable);
        }
        
        return courses.map(courseMapper::toResponse).map(this::enrichCourseResponse);
    }

    @Override
    public Page<CourseResponse> getSpecialOffers(String keyword, String languageCode, Integer minRating, Pageable pageable) {
        OffsetDateTime now = OffsetDateTime.now();
        Float ratingFloat = minRating != null ? minRating.floatValue() : null;

        Page<CourseVersionDiscount> discounts = discountRepository.findSpecialOffers(
                keyword, languageCode, ratingFloat, now, pageable
        );

        return discounts.map(discount -> {
            CourseVersion version = discount.getCourseVersion();
            Course course = version.getCourse();
            
            CourseResponse response = courseMapper.toResponse(course);
            response = enrichCourseResponse(response); 
            
            response.setLatestPublicVersion(versionMapper.toResponse(version));

            response.setActiveDiscountPercentage(discount.getDiscountPercentage());
            
            if (version.getPrice() != null) {
                BigDecimal originalPrice = version.getPrice();
                BigDecimal discountAmount = originalPrice
                        .multiply(BigDecimal.valueOf(discount.getDiscountPercentage()))
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                
                response.setDiscountedPrice(originalPrice.subtract(discountAmount));
            } else {
                response.setDiscountedPrice(BigDecimal.ZERO);
            }
            
            return response;
        });
    }

    @Override
    public List<CourseResponse> getRecommendedCourses(UUID userId, int limit) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        List<CourseVersionEnrollment> enrollments = courseEnrollmentRepository.findByUserId(userId);
        List<UUID> enrolledCourseIds = enrollments.stream()
                .map(enrollment -> {
                    if (enrollment.getCourseVersion() != null) {
                        return enrollment.getCourseVersion().getCourseId(); 
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
    public List<CourseVersionResponse> getCourseVersions(UUID courseId) {
        if (!courseRepository.existsById(courseId)) {
            throw new AppException(ErrorCode.COURSE_NOT_FOUND);
        }
        List<CourseVersion> versions = courseVersionRepository.findByCourseIdAndIsDeletedFalse(courseId);
        
        return versions.stream()
                .sorted(Comparator.comparing(CourseVersion::getVersionNumber).reversed())
                .map(versionMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deleteCourse(UUID id) {
        Course course = courseRepository
                .findByCourseIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_FOUND));
        course.setDeleted(true);
        courseRepository.save(course);

        courseVersionDiscountService.deleteDiscountsByCourseId(id);
        courseEnrollmentService.deleteCourseVersionEnrollmentsByCourseId(id);
    }

    @Override
    public Page<CourseResponse> getEnrolledCoursesByUserId(UUID userId, Pageable pageable) {
        Page<CourseVersionEnrollment> enrollments = courseEnrollmentRepository.findByUserId(userId, pageable);
        return enrollments.map(enrollment -> {
            Course course = courseRepository.findById(enrollment.getCourseVersion().getCourseId()).orElse(null);
            
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

        Course course = courseRepository.findById(version.getCourseId())
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_FOUND));

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
                "A new version (v" + version.getVersionNumber() + ") is available. Update notes: " + version.getReasonForChange()
        );

        return versionMapper.toResponse(version);
    }

    @Override
    @Transactional
    public CourseVersionResponse rejectCourseVersion(UUID versionId, String reason) {
        CourseVersion version = courseVersionRepository.findByVersionIdAndStatus(versionId, VersionStatus.PENDING_APPROVAL)
                .orElseThrow(() -> new AppException(ErrorCode.VERSION_NOT_FOUND_OR_NOT_DRAFT));

        Course course = courseRepository.findById(version.getCourseId())
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_FOUND));

        version.setStatus(VersionStatus.DRAFT);
        version = courseVersionRepository.save(version);

        NotificationRequest creatorNotif = NotificationRequest.builder()
                .userId(course.getCreatorId())
                .title("Course Version Rejected")
                .content("Your new version (v" + version.getVersionNumber() + ") for '" + course.getTitle() + "' was rejected. Reason: " + (reason != null ? reason : "Not specified"))
                .type("COURSE_APPROVAL_REJECTED")
                .build();
        notificationService.createPushNotification(creatorNotif);

        return versionMapper.toResponse(version);
    }

    @Override
    public List<String> getCourseCategories() {
        return List.of("COMMUNICATION", "GRAMMAR", "VOCABULARY", "BUSINESS", "TRAVEL");
    }
}