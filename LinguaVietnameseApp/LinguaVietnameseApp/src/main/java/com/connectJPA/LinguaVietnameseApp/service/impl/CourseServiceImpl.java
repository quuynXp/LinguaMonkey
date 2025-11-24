package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.CreateCourseRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.PublishVersionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.UpdateCourseDetailsRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.UpdateCourseVersionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseSummaryResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseVersionResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Course;
import com.connectJPA.LinguaVietnameseApp.entity.CourseEnrollment;
import com.connectJPA.LinguaVietnameseApp.entity.CourseVersion;
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
import com.connectJPA.LinguaVietnameseApp.grpc.GrpcClientService;
import com.connectJPA.LinguaVietnameseApp.mapper.CourseMapper;
import com.connectJPA.LinguaVietnameseApp.mapper.CourseVersionMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseEnrollmentRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseVersionLessonRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseVersionRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LessonRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.RoleRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRoleRepository;
import com.connectJPA.LinguaVietnameseApp.service.CourseDiscountService;
import com.connectJPA.LinguaVietnameseApp.service.CourseEnrollmentService;
import com.connectJPA.LinguaVietnameseApp.service.CourseService;
import com.connectJPA.LinguaVietnameseApp.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Arrays;
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
    private final CourseEnrollmentRepository courseEnrollmentRepository;
    private final LessonRepository lessonRepository;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final RoleRepository roleRepository;

    private final CourseMapper courseMapper;
    private final CourseVersionMapper versionMapper;

    private final CourseDiscountService courseDiscountService;
    private final CourseEnrollmentService courseEnrollmentService;
    private final GrpcClientService grpcClientService;
    private final NotificationService notificationService;

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
        course.setPrice(request.getPrice());
        course.setApprovalStatus(CourseApprovalStatus.PENDING);
        course = courseRepository.save(course);

        CourseVersion version = new CourseVersion();
        version.setCourse(course);
        version.setVersionNumber(1);
        version.setStatus(VersionStatus.DRAFT);
        courseVersionRepository.save(version);

        return courseMapper.toResponse(course);
    }

    @Override
    @Transactional
    public CourseVersionResponse updateCourseVersion(UUID versionId, UpdateCourseVersionRequest request) {
        CourseVersion version = courseVersionRepository.findByVersionIdAndStatus(versionId, VersionStatus.DRAFT)
                .orElseThrow(() -> new AppException(ErrorCode.VERSION_NOT_FOUND_OR_NOT_DRAFT));

        User creator = userRepository.findById(version.getCourse().getCreatorId())
                .orElseThrow(() -> new AppException(ErrorCode.BAD_REQUEST));

        version.setDescription(request.getDescription());
        version.setThumbnailUrl(request.getThumbnailUrl());

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

        version = courseVersionRepository.save(version);
        return versionMapper.toResponse(version);
    }

    @Override
    @Transactional
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

            sendAdminNotification(
                    "Course Approval Request",
                    "The course '" + course.getTitle() + "' (v" + version.getVersionNumber() + ") requires approval.",
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
        if (publicVersion == null) {
            throw new AppException(ErrorCode.COURSE_NOT_PUBLIC_YET);
        }

        CourseVersion newDraft = new CourseVersion();
        newDraft.setCourse(course);
        newDraft.setVersionNumber(publicVersion.getVersionNumber() + 1);
        newDraft.setStatus(VersionStatus.DRAFT);
        newDraft.setDescription(publicVersion.getDescription());
        newDraft.setThumbnailUrl(publicVersion.getThumbnailUrl());

        newDraft.setLessons(new ArrayList<>());

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
            course.setDifficultyLevel(request.getDifficultyLevel());
        }

        course = courseRepository.save(course);
        return courseMapper.toResponse(course);
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
        List<CourseEnrollment> enrollments = courseEnrollmentRepository.findByCourseVersion_Course_CourseIdAndIsDeletedFalse(course.getCourseId());
        for (CourseEnrollment enrollment : enrollments) {
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
                    return null;
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        // FIX: Handle empty list to prevent SQL "NOT IN ()" or "NOT IN (NULL)" issues in native query
        if (enrolledCourseIds.isEmpty()) {
            // Add a dummy UUID that won't match any real course ID. 
            // This ensures the "NOT IN" clause is syntactically valid and logically correct (excludes nothing).
            enrolledCourseIds.add(UUID.fromString("00000000-0000-0000-0000-000000000000"));
        }

        List<Course> recommended = courseRepository.findRecommendedCourses(
                user.getProficiency() != null ? user.getProficiency().name() : null, // Convert Enum to String
                user.getNativeLanguageCode(),
                enrolledCourseIds,
                limit
        );
        return recommended.stream().map(courseMapper::toResponse).collect(Collectors.toList());
    }

    @Override
    public List<CourseSummaryResponse> getCourseSummariesByTeacher(UUID teacherId, int limit) {
        List<Course> courses = courseRepository.findByCreatorIdAndIsDeletedFalse(teacherId);

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
    public CourseResponse getCourseById(UUID id) {
        Course course = courseRepository
                .findByCourseIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_FOUND));
        return courseMapper.toResponse(course);
    }

    @Override
    @Transactional
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
    public Page<CourseResponse> getCoursesByCreator(UUID creatorId, Pageable pageable) {
        Page<Course> courses = courseRepository.findByCreatorIdAndIsDeletedFalse(creatorId, pageable);
        return courses.map(courseMapper::toResponse);
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