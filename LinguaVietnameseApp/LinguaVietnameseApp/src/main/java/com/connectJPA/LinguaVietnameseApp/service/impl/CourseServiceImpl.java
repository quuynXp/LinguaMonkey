package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseSummaryResponse;
import com.connectJPA.LinguaVietnameseApp.entity.*;
import com.connectJPA.LinguaVietnameseApp.enums.CourseApprovalStatus;
import com.connectJPA.LinguaVietnameseApp.enums.CourseType;
import com.connectJPA.LinguaVietnameseApp.enums.RoleName;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.grpc.GrpcClientService;
import com.connectJPA.LinguaVietnameseApp.mapper.CourseMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.*;
import com.connectJPA.LinguaVietnameseApp.service.CourseDiscountService;
import com.connectJPA.LinguaVietnameseApp.service.CourseEnrollmentService;
import com.connectJPA.LinguaVietnameseApp.service.CourseService;
import learning.CourseQualityResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CourseServiceImpl implements CourseService {

    private final CourseRepository courseRepository;
    private final CourseMapper courseMapper;
    private final CourseDiscountService courseDiscountService;
    private final CourseEnrollmentService courseEnrollmentService;
    private final CourseEnrollmentRepository courseEnrollmentRepository;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final LessonRepository lessonRepository;
    private final GrpcClientService grpcClientService;
    private final RoleRepository roleRepository;

    @Cacheable(value = "courses", key = "#title + ':' + #languageCode + ':' + #pageable")
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

        List<UUID> enrolledCourseIds = courseEnrollmentRepository.findByUserId(userId)
                .stream().map(CourseEnrollment::getCourseId).toList();

        List<Course> recommended = courseRepository.findRecommendedCourses(
                user.getProficiency(),
                user.getNativeLanguageCode(),
                enrolledCourseIds,
                limit
        );

        return recommended.stream().map(courseMapper::toResponse).toList();
    }


    @Override
    public List<CourseSummaryResponse> getCourseSummariesByTeacher(UUID teacherId, int limit) {
        List<Course> courses = courseRepository.findByCreatorIdAndIsDeletedFalse(teacherId);
        return courses.stream()
                .map(c -> new CourseSummaryResponse(c.getCourseId(), c.getTitle(), c.getThumbnailUrl()))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public CourseResponse approveCourse(UUID id) {
        Course c = courseRepository.findByCourseIdAndIsDeletedFalse(id).orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_FOUND));
        c.setApprovalStatus(CourseApprovalStatus.APPROVED);
        courseRepository.save(c);
        return courseMapper.toResponse(c);
    }

    @Override
    @Transactional
    public CourseResponse rejectCourse(UUID id, String reason) {
        Course c = courseRepository.findByCourseIdAndIsDeletedFalse(id).orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_FOUND));
        c.setApprovalStatus(CourseApprovalStatus.REJECTED);
        courseRepository.save(c);
        return courseMapper.toResponse(c);
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
    @CacheEvict(value = {"courses"}, allEntries = true)
    public CourseResponse createCourse(CourseRequest request) {
        UUID creatorId = request.getCreatorId();
        User teacher = userRepository.findById(creatorId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        Optional<Role> role = roleRepository.findByRoleNameAndIsDeletedFalse(RoleName.TEACHER);


        // ensure user has teacher role
        if (role.isPresent() && !userRoleRepository.findRolesByUserId(creatorId).contains(role))
            throw new AppException(ErrorCode.UNAUTHORIZED);

        List<UUID> lessonIds = request.getLessonIds();
        if (lessonIds == null || lessonIds.isEmpty()) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        final int MIN_LESSONS = 5; // BẮT BUỘC 5 bài trước khi tạo course
        if (lessonIds.size() < MIN_LESSONS) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        // validate lessons exist and belong to creator
        List<Lesson> lessons = lessonRepository.findByCreatorIdAndLessonIdIn(creatorId, lessonIds);
        if (lessons.size() != lessonIds.size()) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        if (request.getPrice() != null && request.getPrice().compareTo(BigDecimal.ZERO) > 0) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        Course course = courseMapper.toEntity(request);
        course.setCreatorId(creatorId);
        course.setApprovalStatus(CourseApprovalStatus.PENDING);
        course = courseRepository.save(course);

        // link lessons to course and set first 5 lessons as free
        // ensure deterministic order: use orderIndex if present, else the order of lessonIds provided
        List<Lesson> orderedLessons = lessons.stream()
                .sorted((a, b) -> {
                    Integer ai = (a.getOrderIndex() == null) ? 0 : a.getOrderIndex();
                    Integer bi = b.getOrderIndex() == null ? 0 : b.getOrderIndex();
                    return ai.compareTo(bi);
                }).toList();

        // If teacher provided a specific order via lessonIds, better respect that:
        // Reorder by index in lessonIds list if orderIndex all zero/duplicate
        // (optional) -- for deterministic behavior, you can use lessonIds order:
        if (orderedLessons.stream().allMatch(l -> l.getOrderIndex() == null || l.getOrderIndex() == 0)) {
            List<Lesson> finalOrderedLessons = orderedLessons;
            orderedLessons = lessonIds.stream()
                    .map(id -> finalOrderedLessons.stream().filter(l -> l.getLessonId().equals(id)).findFirst().orElse(null))
                    .filter(Objects::nonNull)
                    .toList();
        }

        // set courseId and isFree
        for (int i = 0; i < orderedLessons.size(); i++) {
            Lesson l = orderedLessons.get(i);
            l.setCourseId(course.getCourseId());
            // set isFree = true only for the first MIN_LESSONS
            l.setFree(i < MIN_LESSONS);
        }
        lessonRepository.saveAll(orderedLessons);

        // Prepare prompt for AI moderation
        StringBuilder prompt = new StringBuilder();
        prompt.append("Please evaluate this course for policy/quality. Title: ").append(course.getTitle())
                .append("\nDescription: ").append(course.getDescription()).append("\nLessons:\n");
        for (Lesson l : orderedLessons) {
            prompt.append("- ").append(l.getTitle()).append(": ").append(
                    l.getDescription() == null ? "" : l.getDescription().substring(0, Math.min(200, l.getDescription().length()))
            ).append("\n");
        }
        try {
            // Gọi AI để phân tích chất lượng khóa học thay cho moderation
            List<String> lessonIdStrings = orderedLessons.stream()
                    .map(l -> l.getLessonId().toString())
                    .toList();

            CourseQualityResponse aiResponse = grpcClientService
                    .callAnalyzeCourseQualityAsync("", course.getCourseId().toString(), lessonIdStrings)
                    .get();

            if (aiResponse == null || !aiResponse.getError().isEmpty()) {
                course.setApprovalStatus(CourseApprovalStatus.PENDING);
            } else {
                aiResponse.getVerdict();
                String verdict = aiResponse.getVerdict().toUpperCase();
                float score = aiResponse.getQualityScore();

                // Phán quyết dựa vào verdict + điểm chất lượng
                if (verdict.contains("APPROVE") || verdict.contains("GOOD") || score >= 0.8) {
                    course.setApprovalStatus(CourseApprovalStatus.APPROVED);
                } else if (verdict.contains("REJECT") || verdict.contains("BAD") || score < 0.4) {
                    course.setApprovalStatus(CourseApprovalStatus.REJECTED);
                } else {
                    course.setApprovalStatus(CourseApprovalStatus.PENDING);
                }

                // Ghi log hoặc cảnh báo nếu có
                if (!aiResponse.getWarningsList().isEmpty()) {
                    System.out.println("⚠️ AI warnings: " + aiResponse.getWarningsList());
                }
            }
        } catch (Exception e) {
            course.setApprovalStatus(CourseApprovalStatus.PENDING);
        }

        course = courseRepository.save(course);
        return courseMapper.toResponse(course);
    }



    @Override
    @Transactional
    @CachePut(value = "course", key = "#id")
    @CacheEvict(value = "courses", allEntries = true)
    public CourseResponse updateCourse(UUID id, CourseRequest request) {
        Course course = courseRepository
                .findByCourseIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_FOUND));
        courseMapper.updateEntityFromRequest(request, course);
        course = courseRepository.save(course);
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

        // Xử lý xóa liên quan
        courseDiscountService.deleteCourseDiscountsByCourseId(id);
        courseEnrollmentService.deleteCourseEnrollmentsByCourseId(id);
    }

    @Cacheable(value = "enrolledCoursesByUser", key = "#userId + ':' + #pageable")
    @Override
    public Page<CourseResponse> getEnrolledCoursesByUserId(UUID userId, Pageable pageable) {
        Page<CourseEnrollment> enrollments = courseEnrollmentRepository.findByUserId(userId, pageable);
        return enrollments.map(enrollment -> {
            Course course = courseRepository.findById(enrollment.getCourseId())
                    .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_FOUND));
            return courseMapper.toResponse(course);
        });
    }

    @Cacheable(value = "coursesByCreator", key = "#creatorId + ':' + #pageable")
    @Override
    public Page<CourseResponse> getCoursesByCreator(UUID creatorId, Pageable pageable) {
        Page<Course> courses = courseRepository.findByCreatorIdAndIsDeletedFalse(creatorId, pageable);
        return courses.map(courseMapper::toResponse);
    }


}
