package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.CreateCourseRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest; // THÊM IMPORT
import com.connectJPA.LinguaVietnameseApp.dto.request.PublishVersionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.UpdateCourseDetailsRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.UpdateCourseVersionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseSummaryResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseVersionResponse;
import com.connectJPA.LinguaVietnameseApp.entity.*;
import com.connectJPA.LinguaVietnameseApp.enums.*;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.grpc.GrpcClientService;
import com.connectJPA.LinguaVietnameseApp.mapper.CourseMapper;
import com.connectJPA.LinguaVietnameseApp.mapper.CourseVersionMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.*;
import com.connectJPA.LinguaVietnameseApp.service.CourseDiscountService;
import com.connectJPA.LinguaVietnameseApp.service.CourseEnrollmentService;
import com.connectJPA.LinguaVietnameseApp.service.CourseService;
import com.connectJPA.LinguaVietnameseApp.service.NotificationService; // THÊM IMPORT
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CourseServiceImpl implements CourseService {

    // === REPOSITORIES ===
    private final CourseRepository courseRepository;
    private final CourseVersionRepository courseVersionRepository;
    private final CourseVersionLessonRepository cvlRepository;
    private final CourseEnrollmentRepository courseEnrollmentRepository;
    private final LessonRepository lessonRepository;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final RoleRepository roleRepository;

    // === MAPPERS ===
    private final CourseMapper courseMapper;
    private final CourseVersionMapper versionMapper;

    // === OTHER SERVICES ===
    private final CourseDiscountService courseDiscountService;
    private final CourseEnrollmentService courseEnrollmentService;
    private final GrpcClientService grpcClientService;
    private final NotificationService notificationService; // THÊM SERVICE

    // =================================================================
    // === FLOW QUẢN LÝ VERSIONING MỚI (CORE LOGIC) ===
    // =================================================================

    @Override
    @Transactional
    @CacheEvict(value = "courses", allEntries = true)
    public CourseResponse createCourse(CreateCourseRequest request) {
        User creator = userRepository.findById(request.getCreatorId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // TODO: Validate creator has TEACHER role
        // (Giả sử bạn có logic này)

        // 1. Tạo Course (chỉ chứa thông tin gốc)
        Course course = new Course();
        course.setTitle(request.getTitle());
        course.setCreatorId(request.getCreatorId());
        course.setPrice(request.getPrice());
        course.setApprovalStatus(CourseApprovalStatus.PENDING); // Course PENDING
        course = courseRepository.save(course);

        // 2. Tạo CourseVersion đầu tiên (bản nháp)
        CourseVersion version = new CourseVersion();
        version.setCourse(course);
        version.setVersionNumber(1);
        version.setStatus(VersionStatus.DRAFT); // Trạng thái DRAFT
        courseVersionRepository.save(version);

        return courseMapper.toResponse(course);
    }

    @Override
    @Transactional
    public CourseVersionResponse updateCourseVersion(UUID versionId, UpdateCourseVersionRequest request) {
        CourseVersion version = courseVersionRepository.findByVersionIdAndStatus(versionId, VersionStatus.DRAFT)
                .orElseThrow(() -> new AppException(ErrorCode.VERSION_NOT_FOUND_OR_NOT_DRAFT));

        User creator = userRepository.findById(version.getCourse().getCreatorId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        version.setDescription(request.getDescription());
        version.setThumbnailUrl(request.getThumbnailUrl());

        // Cập nhật danh sách lessons
        if (version.getLessons() != null) {
            version.getLessons().clear(); // Kích hoạt orphanRemoval
        } else {
            version.setLessons(new ArrayList<>());
        }

        // (Cách dùng cvlRepository.deleteAllBy... cũng được, nhưng cách này an toàn hơn với Cascade)

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

        version = courseVersionRepository.save(version);
        return versionMapper.toResponse(version);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"courses", "course"}, allEntries = true)
    public CourseVersionResponse publishCourseVersion(UUID versionId, PublishVersionRequest request) {
        CourseVersion version = courseVersionRepository.findByVersionIdAndStatus(versionId, VersionStatus.DRAFT)
                .orElseThrow(() -> new AppException(ErrorCode.VERSION_NOT_FOUND_OR_NOT_DRAFT));

        version.setReasonForChange(request.getReasonForChange());
        Course course = version.getCourse();
        boolean requiresAdminApproval = false;

        if (course.getPrice() != null && course.getPrice().compareTo(BigDecimal.ZERO) > 0) {
            requiresAdminApproval = true;
        }

        if (version.getVersionNumber() > 1) {
            CourseVersion previousVersion = courseVersionRepository.findLatestPublicVersionByCourseId(course.getCourseId())
                    .orElse(null);
            if (isMajorChange(version, previousVersion)) {
                requiresAdminApproval = true;
            }
        }

        if (version.getLessons() == null || version.getLessons().isEmpty() || version.getLessons().size() < 5) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        if (requiresAdminApproval) {
            version.setStatus(VersionStatus.PENDING_APPROVAL);

            // === GỬI THÔNG BÁO CHO ADMIN ===
            sendAdminNotification(
                    "Course Approval Request",
                    "The course '" + course.getTitle() + "' (v" + version.getVersionNumber() + ") requires approval.",
                    "COURSE_APPROVAL_PENDING"
            );
            // === KẾT THÚC THÔNG BÁO ===

        } else {
            version.setStatus(VersionStatus.PUBLIC);
            version.setPublishedAt(OffsetDateTime.now());
            course.setLatestPublicVersion(version);
            course.setApprovalStatus(CourseApprovalStatus.APPROVED);
            courseRepository.save(course);

            // === GỬI THÔNG BÁO CHO HỌC VIÊN ===
            sendLearnerUpdateNotification(
                    course,
                    version,
                    "A new version (v" + version.getVersionNumber() + ") is available. Reason: " + version.getReasonForChange()
            );
            // === KẾT THÚC THÔNG BÁO ===
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
        if (publicVersion == null) {
            throw new AppException(ErrorCode.COURSE_NOT_PUBLIC_YET);
        }

        CourseVersion newDraft = new CourseVersion();
        newDraft.setCourse(course);
        newDraft.setVersionNumber(publicVersion.getVersionNumber() + 1);
        newDraft.setStatus(VersionStatus.DRAFT);
        newDraft.setDescription(publicVersion.getDescription());
        newDraft.setThumbnailUrl(publicVersion.getThumbnailUrl());

        newDraft.setLessons(new ArrayList<>()); // Khởi tạo list

        List<CourseVersionLesson> oldLessons = cvlRepository.findByCourseVersion_VersionIdOrderByOrderIndex(publicVersion.getVersionId());

        for (CourseVersionLesson oldCvl : oldLessons) {
            CourseVersionLesson newCvl = new CourseVersionLesson(newDraft, oldCvl.getLesson(), oldCvl.getOrderIndex());
            newDraft.getLessons().add(newCvl);
        }

        newDraft = courseVersionRepository.save(newDraft);

        return versionMapper.toResponse(newDraft);
    }

    @Override
    @Transactional
    @CachePut(value = "course", key = "#id")
    @CacheEvict(value = "courses", allEntries = true)
    public CourseResponse updateCourseDetails(UUID id, UpdateCourseDetailsRequest request) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_FOUND));

        if (request.getTitle() != null) {
            course.setTitle(request.getTitle());
        }
        if (request.getPrice() != null) {
            course.setPrice(request.getPrice());
        }
        if (request.getLanguageCode() != null) {
            course.setLanguageCode(request.getLanguageCode());
        }
        if (request.getDifficultyLevel() != null) {
            course.setDifficultyLevel(request.getDifficultyLevel()); // SỬA LỖI: Bỏ .valueOf()
        }

        course = courseRepository.save(course);
        return courseMapper.toResponse(course);
    }

    // =================================================================
    // === HÀM HELPER ===
    // =================================================================

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
        return changePercentage > 0.3; // Hơn 30% là thay đổi lớn
    }

    // === CÁC HÀM HELPER GỬI THÔNG BÁO ===

    private void sendAdminNotification(String title, String content, String type) {
        // Giả định RoleName.ADMIN tồn tại
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
        List<CourseEnrollment> enrollments = courseEnrollmentRepository.findByCourseVersion_Course_CourseIdAndIsDeletedFalse(course.getCourseId());
        for (CourseEnrollment enrollment : enrollments) {
            // Chỉ thông báo nếu họ *không* ở version mới nhất
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


    // =================================================================
    // === CÁC HÀM GET/DELETE (ĐÃ REFACTOR) ===
    // =================================================================

    @Override
    @Cacheable(value = "courses", key = "#title + ':' + #languageCode + ':' + #pageable")
    public Page<CourseResponse> getAllCourses(String title, String languageCode, CourseType type, Pageable pageable) {
        Page<Course> courses;
        if (type == null) {
            courses = courseRepository.findByTitleContainingIgnoreCaseAndLanguageCodeAndApprovalStatusAndIsDeletedFalse(
                    title, languageCode, CourseApprovalStatus.APPROVED, pageable);
        } else {
            courses = courseRepository.findByTypeAndApprovalStatusAndIsDeletedFalse(type, CourseApprovalStatus.APPROVED, pageable);
        }
        return courses.map(courseMapper::toResponse);
    }

    @Override
    public List<CourseResponse> getRecommendedCourses(UUID userId, int limit) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        List<CourseEnrollment> enrollments = courseEnrollmentRepository.findByUserId(userId);

        List<UUID> enrolledCourseIds = enrollments.stream()
                .map(enrollment -> {
                    if (enrollment.getCourseVersion() != null && enrollment.getCourseVersion().getCourse() != null) {
                        return enrollment.getCourseVersion().getCourse().getCourseId();
                    }
                    return null; // An toàn nếu data bị null
                })
                .filter(Objects::nonNull) // Lọc bỏ các enrollment có thể bị lỗi data
                .collect(Collectors.toList());

        List<Course> recommended = courseRepository.findRecommendedCourses(
                user.getProficiency(),
                user.getNativeLanguageCode(),
                enrolledCourseIds,
                limit
        );
        return recommended.stream().map(courseMapper::toResponse).collect(Collectors.toList());
    }

    @Override
    public List<CourseSummaryResponse> getCourseSummariesByTeacher(UUID teacherId, int limit) {
        List<Course> courses = courseRepository.findByCreatorIdAndIsDeletedFalse(teacherId);

        // SỬA LỖI: Lấy thumbnail từ latestPublicVersion
        return courses.stream()
                .map(c -> {
                    return new CourseSummaryResponse(c.getCourseId(), c.getTitle());
                })
                .collect(Collectors.toList());
    }

    @Override
    public Page<CourseResponse> getDiscountedCourses(Pageable pageable) {
        Page<Course> discounted = courseRepository.findDiscountedCourses(pageable);
        return discounted.map(courseMapper::toResponse);
    }

    @Override
    @Cacheable(value = "course", key = "#id")
    public CourseResponse getCourseById(UUID id) {
        Course course = courseRepository
                .findByCourseIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_FOUND));
        return courseMapper.toResponse(course);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"course", "courses"}, key = "#id", allEntries = true)
    public void deleteCourse(UUID id) {
        Course course = courseRepository
                .findByCourseIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_FOUND));
        course.setDeleted(true);
        courseRepository.save(course);

        courseDiscountService.deleteCourseDiscountsByCourseId(id);
        courseEnrollmentService.deleteCourseEnrollmentsByCourseId(id);
    }

    @Override
    @Cacheable(value = "enrolledCoursesByUser", key = "#userId + ':' + #pageable")
    public Page<CourseResponse> getEnrolledCoursesByUserId(UUID userId, Pageable pageable) {
        Page<CourseEnrollment> enrollments = courseEnrollmentRepository.findByUserId(userId, pageable);
        return enrollments.map(enrollment -> {
            Course course = enrollment.getCourseVersion().getCourse(); 
            if (course == null) {
                throw new AppException(ErrorCode.COURSE_NOT_FOUND); 
            }
            return courseMapper.toResponse(course);
        });
    }

    @Override
    @Cacheable(value = "coursesByCreator", key = "#creatorId + ':' + #pageable")
    public Page<CourseResponse> getCoursesByCreator(UUID creatorId, Pageable pageable) {
        Page<Course> courses = courseRepository.findByCreatorIdAndIsDeletedFalse(creatorId, pageable);
        return courses.map(courseMapper::toResponse);
    }

    // =================================================================
    // === CÁC HÀM ADMIN MỚI (CHO VERSIONING) ===
    // =================================================================

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

        // === GỬI THÔNG BÁO CHO CREATOR VÀ LEARNERS ===
        // 1. Gửi thông báo cho Creator
        NotificationRequest creatorNotif = NotificationRequest.builder()
                .userId(course.getCreatorId())
                .title("Course Version Approved")
                .content("Your new version (v" + version.getVersionNumber() + ") for '" + course.getTitle() + "' has been approved and is now public.")
                .type("COURSE_APPROVAL_SUCCESS")
                .build();
        notificationService.createPushNotification(creatorNotif);

        // 2. Gửi thông báo cho Learners
        sendLearnerUpdateNotification(
                course,
                version,
                "A new version (v" + version.getVersionNumber() + ") is available. Reason: " + version.getReasonForChange()
        );
        // === KẾT THÚC THÔNG BÁO ===

        return versionMapper.toResponse(version);
    }

    @Override
    @Transactional
    public CourseVersionResponse rejectCourseVersion(UUID versionId, String reason) {
        CourseVersion version = courseVersionRepository.findByVersionIdAndStatus(versionId, VersionStatus.PENDING_APPROVAL)
                .orElseThrow(() -> new AppException(ErrorCode.VERSION_NOT_FOUND_OR_NOT_DRAFT));

        version.setStatus(VersionStatus.DRAFT);
        version = courseVersionRepository.save(version);

        // === GỬI THÔNG BÁO CHO CREATOR ===
        NotificationRequest creatorNotif = NotificationRequest.builder()
                .userId(version.getCourse().getCreatorId())
                .title("Course Version Rejected")
                .content("Your new version (v" + version.getVersionNumber() + ") for '" + version.getCourse().getTitle() + "' was rejected. Reason: " + (reason != null ? reason : "Not specified"))
                .type("COURSE_APPROVAL_REJECTED")
                .build();
        notificationService.createPushNotification(creatorNotif);
        // === KẾT THÚC THÔNG BÁO ===

        return versionMapper.toResponse(version);
    }
}