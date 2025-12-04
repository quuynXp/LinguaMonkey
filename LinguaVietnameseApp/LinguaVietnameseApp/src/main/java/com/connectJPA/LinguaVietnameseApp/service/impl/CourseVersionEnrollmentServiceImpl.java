package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseVersionEnrollmentRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.SwitchVersionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseVersionEnrollmentResponse;
import com.connectJPA.LinguaVietnameseApp.entity.CourseVersionEnrollment;
import com.connectJPA.LinguaVietnameseApp.entity.CourseVersion;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.mapper.CourseVersionEnrollmentMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseVersionEnrollmentRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseVersionRepository;
import com.connectJPA.LinguaVietnameseApp.service.CourseVersionEnrollmentService;
import com.connectJPA.LinguaVietnameseApp.service.RoomService;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CourseVersionEnrollmentServiceImpl implements CourseVersionEnrollmentService {
    private final CourseVersionEnrollmentRepository courseVersionEnrollmentRepository;
    private final CourseVersionEnrollmentMapper CourseVersionEnrollmentMapper;
    private final RedisTemplate<String, Object> redisTemplate;
    private final CourseVersionRepository courseVersionRepository;
    private final RoomService roomService;

    @Override
    public Page<CourseVersionEnrollmentResponse> getAllCourseVersionEnrollments(UUID courseId, UUID userId, Pageable pageable) {
        try {
            Page<CourseVersionEnrollment> enrollments = courseVersionEnrollmentRepository.findAllByCourseVersion_Course_CourseIdAndUserIdAndIsDeletedFalse(courseId, userId, pageable);
            return enrollments.map(CourseVersionEnrollmentMapper::toResponse);
        } catch (RedisConnectionFailureException e) {
            throw new AppException(ErrorCode.REDIS_CONNECTION_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Transactional
    @Override
    public CourseVersionEnrollmentResponse switchCourseVersion(SwitchVersionRequest request) {
        try {
            CourseVersionEnrollment enrollment = courseVersionEnrollmentRepository.findById(request.getEnrollmentId())
                    .orElseThrow(() -> new AppException(ErrorCode.COURSE_ENROLLMENT_NOT_FOUND));

            CourseVersion newVersion = courseVersionRepository.findById(request.getNewVersionId())
                    .orElseThrow(() -> new AppException(ErrorCode.COURSE_VERSION_NOT_FOUND)); 

            enrollment.setCourseVersion(newVersion);
            CourseVersionEnrollment updatedEnrollment = courseVersionEnrollmentRepository.save(enrollment);

            return CourseVersionEnrollmentMapper.toResponse(updatedEnrollment);

        } catch (RedisConnectionFailureException e) {
            throw new AppException(ErrorCode.REDIS_CONNECTION_FAILED);
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public CourseVersionEnrollmentResponse getCourseVersionEnrollmentByIds(UUID courseId, UUID userId) {
        try {
            CourseVersionEnrollment enrollment = courseVersionEnrollmentRepository.findByCourseVersion_Course_CourseIdAndUserIdAndIsDeletedFalse(courseId, userId)
                    .orElseThrow(() -> new AppException(ErrorCode.COURSE_ENROLLMENT_NOT_FOUND));
            return CourseVersionEnrollmentMapper.toResponse(enrollment);
        } catch (RedisConnectionFailureException e) {
            throw new AppException(ErrorCode.REDIS_CONNECTION_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public CourseVersionEnrollmentResponse createCourseVersionEnrollment(CourseVersionEnrollmentRequest request) {
        try {
            CourseVersionEnrollment enrollment = CourseVersionEnrollmentMapper.toEntity(request);
            
            CourseVersion version = courseVersionRepository.findById(request.getCourseVersionId())
                    .orElseThrow(() -> new AppException(ErrorCode.COURSE_VERSION_NOT_FOUND));
            enrollment.setCourseVersion(version);

            enrollment = courseVersionEnrollmentRepository.save(enrollment);

            UUID courseId = version.getCourseId();
            roomService.addUserToCourseRoom(courseId, enrollment.getUserId());

            return CourseVersionEnrollmentMapper.toResponse(enrollment);
        } catch (RedisConnectionFailureException e) {
            throw new AppException(ErrorCode.REDIS_CONNECTION_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public CourseVersionEnrollmentResponse updateCourseVersionEnrollment(UUID courseId, UUID userId, CourseVersionEnrollmentRequest request) {
        try {
            CourseVersionEnrollment enrollment = courseVersionEnrollmentRepository.findByCourseVersion_Course_CourseIdAndUserIdAndIsDeletedFalse(courseId, userId)
                    .orElseThrow(() -> new AppException(ErrorCode.COURSE_ENROLLMENT_NOT_FOUND));
            CourseVersionEnrollmentMapper.updateEntityFromRequest(request, enrollment);
            
            if (request.getCourseVersionId() != null) {
                CourseVersion newVersion = courseVersionRepository.findById(request.getCourseVersionId())
                        .orElseThrow(() -> new AppException(ErrorCode.COURSE_VERSION_NOT_FOUND));
                enrollment.setCourseVersion(newVersion);
            }
            
            enrollment = courseVersionEnrollmentRepository.save(enrollment);
            return CourseVersionEnrollmentMapper.toResponse(enrollment);
        } catch (RedisConnectionFailureException e) {
            throw new AppException(ErrorCode.REDIS_CONNECTION_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public void deleteCourseVersionEnrollment(UUID courseId, UUID userId) {
        try {
            CourseVersionEnrollment enrollment = courseVersionEnrollmentRepository.findByCourseVersion_Course_CourseIdAndUserIdAndIsDeletedFalse(courseId, userId)
                    .orElseThrow(() -> new AppException(ErrorCode.COURSE_ENROLLMENT_NOT_FOUND));
            enrollment.setDeleted(true);
            courseVersionEnrollmentRepository.save(enrollment);
        } catch (RedisConnectionFailureException e) {
            throw new AppException(ErrorCode.REDIS_CONNECTION_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public void deleteCourseVersionEnrollmentsByCourseId(UUID courseId) {
        // Logic handled via cascade or manual iteration if needed
    }
}