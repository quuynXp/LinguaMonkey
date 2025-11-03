package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseEnrollmentRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseEnrollmentResponse;
import com.connectJPA.LinguaVietnameseApp.entity.CourseEnrollment;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.mapper.CourseEnrollmentMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseEnrollmentRepository;
import com.connectJPA.LinguaVietnameseApp.service.CourseEnrollmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CourseEnrollmentServiceImpl implements CourseEnrollmentService {
    private final CourseEnrollmentRepository courseEnrollmentRepository;
    private final CourseEnrollmentMapper courseEnrollmentMapper;
    private final RedisTemplate<String, Object> redisTemplate;

    @Override
    @Cacheable(value = "courseEnrollments", key = "#courseId + ':' + #userId + ':' + #pageable")
    public Page<CourseEnrollmentResponse> getAllCourseEnrollments(UUID courseId, UUID userId, Pageable pageable) {
        try {
            Page<CourseEnrollment> enrollments = courseEnrollmentRepository.findAllByCourseIdAndUserIdAndIsDeletedFalse(courseId, userId, pageable);
            return enrollments.map(courseEnrollmentMapper::toResponse);
        } catch (RedisConnectionFailureException e) {
            throw new AppException(ErrorCode.REDIS_CONNECTION_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Cacheable(value = "courseEnrollment", key = "#courseId + ':' + #userId")
    public CourseEnrollmentResponse getCourseEnrollmentByIds(UUID courseId, UUID userId) {
        try {
            CourseEnrollment enrollment = courseEnrollmentRepository.findByCourseIdAndUserIdAndIsDeletedFalse(courseId, userId)
                    .orElseThrow(() -> new AppException(ErrorCode.COURSE_ENROLLMENT_NOT_FOUND));
            return courseEnrollmentMapper.toResponse(enrollment);
        } catch (RedisConnectionFailureException e) {
            throw new AppException(ErrorCode.REDIS_CONNECTION_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = {"courseEnrollments"}, allEntries = true)
    public CourseEnrollmentResponse createCourseEnrollment(CourseEnrollmentRequest request) {
        try {
            CourseEnrollment enrollment = courseEnrollmentMapper.toEntity(request);
            enrollment = courseEnrollmentRepository.save(enrollment);
            return courseEnrollmentMapper.toResponse(enrollment);
        } catch (RedisConnectionFailureException e) {
            throw new AppException(ErrorCode.REDIS_CONNECTION_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CachePut(value = "courseEnrollment", key = "#courseId + ':' + #userId")
    public CourseEnrollmentResponse updateCourseEnrollment(UUID courseId, UUID userId, CourseEnrollmentRequest request) {
        try {
            CourseEnrollment enrollment = courseEnrollmentRepository.findByCourseIdAndUserIdAndIsDeletedFalse(courseId, userId)
                    .orElseThrow(() -> new AppException(ErrorCode.COURSE_ENROLLMENT_NOT_FOUND));
            courseEnrollmentMapper.updateEntityFromRequest(request, enrollment);
            enrollment = courseEnrollmentRepository.save(enrollment);
            return courseEnrollmentMapper.toResponse(enrollment);
        } catch (RedisConnectionFailureException e) {
            throw new AppException(ErrorCode.REDIS_CONNECTION_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = "courseEnrollment", key = "#courseId + ':' + #userId")
    public void deleteCourseEnrollment(UUID courseId, UUID userId) {
        try {
            CourseEnrollment enrollment = courseEnrollmentRepository.findByCourseIdAndUserIdAndIsDeletedFalse(courseId, userId)
                    .orElseThrow(() -> new AppException(ErrorCode.COURSE_ENROLLMENT_NOT_FOUND));
            enrollment.setDeleted(true);
            courseEnrollmentRepository.save(enrollment);
        } catch (RedisConnectionFailureException e) {
            throw new AppException(ErrorCode.REDIS_CONNECTION_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public void deleteCourseEnrollmentsByCourseId(UUID courseId) {

    }
}