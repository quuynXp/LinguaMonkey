package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Course;
import com.connectJPA.LinguaVietnameseApp.entity.CourseEnrollment;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.enums.CourseType;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.mapper.CourseMapper;
import com.connectJPA.LinguaVietnameseApp.repository.CourseEnrollmentRepository;
import com.connectJPA.LinguaVietnameseApp.repository.CourseRepository;
import com.connectJPA.LinguaVietnameseApp.repository.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.CourseDiscountService;
import com.connectJPA.LinguaVietnameseApp.service.CourseEnrollmentService;
import com.connectJPA.LinguaVietnameseApp.service.CourseService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static com.nimbusds.jose.Requirement.RECOMMENDED;

@Service
@RequiredArgsConstructor
public class CourseServiceImpl implements CourseService {

    private final CourseRepository courseRepository;
    private final CourseMapper courseMapper;
    private final CourseDiscountService courseDiscountService;
    private final CourseEnrollmentService courseEnrollmentService;
    private final CourseEnrollmentRepository courseEnrollmentRepository;
    private final UserRepository userRepository;

    @Cacheable(value = "courses", key = "#title + ':' + #languageCode + ':' + #pageable")
    @Override
    public Page<CourseResponse> getAllCourses(String title, String languageCode, CourseType type, Pageable pageable) {
        Page<Course> courses;
        if (type == null) {
            courses = courseRepository.findByTitleContainingIgnoreCaseAndLanguageCodeAndIsDeletedFalse(
                    title, languageCode, pageable);
        } else {
            courses = courseRepository.findByTypeAndIsDeletedFalse(type, pageable);
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
        Course course = courseMapper.toEntity(request);
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

    @Override
    @Cacheable(value = "enrolledCoursesByUser", key = "#userId + ':' + #pageable")
    public Page<CourseResponse> getEnrolledCoursesByUserId(UUID userId, Pageable pageable) {
        Page<CourseEnrollment> enrollments = courseEnrollmentRepository.findByUserId(userId, pageable);
        return enrollments.map(enrollment -> {
            Course course = courseRepository.findById(enrollment.getCourseId())
                    .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_FOUND));
            return courseMapper.toResponse(course);
        });
    }

    @Override
    @Cacheable(value = "coursesByCreator", key = "#creatorId + ':' + #pageable")
    public Page<CourseResponse> getCoursesByCreator(UUID creatorId, Pageable pageable) {
        Page<Course> courses = courseRepository.findByCreatorIdAndIsDeletedFalse(creatorId, pageable);
        return courses.map(courseMapper::toResponse);
    }


}
