package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseVersionEnrollmentRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.SwitchVersionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseVersionEnrollmentResponse;
import com.connectJPA.LinguaVietnameseApp.entity.CourseVersionEnrollment;
import com.connectJPA.LinguaVietnameseApp.entity.CourseVersionLesson;
import com.connectJPA.LinguaVietnameseApp.entity.Lesson;
import com.connectJPA.LinguaVietnameseApp.entity.LessonProgress;
import com.connectJPA.LinguaVietnameseApp.entity.id.LessonProgressId;
import com.connectJPA.LinguaVietnameseApp.enums.CourseVersionEnrollmentStatus;
import com.connectJPA.LinguaVietnameseApp.entity.CourseVersion;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.mapper.CourseVersionEnrollmentMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseVersionEnrollmentRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseVersionLessonRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseVersionRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LessonProgressRepository;
import com.connectJPA.LinguaVietnameseApp.service.CourseVersionEnrollmentService;
import com.connectJPA.LinguaVietnameseApp.service.RoomService;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CourseVersionEnrollmentServiceImpl implements CourseVersionEnrollmentService {
    private final CourseVersionEnrollmentRepository courseVersionEnrollmentRepository;
    private final CourseVersionEnrollmentMapper CourseVersionEnrollmentMapper;
    private final RedisTemplate<String, Object> redisTemplate;
    private final CourseVersionRepository courseVersionRepository;
    private final RoomService roomService;
    private final LessonProgressRepository lessonProgressRepository;
    private final CourseVersionLessonRepository cvlRepository;
    private final CourseVersionEnrollmentRepository enrollmentRepository;  

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

    @Override
    @Transactional
    public void syncEnrollmentProgress(UUID userId, UUID courseVersionId) {
        CourseVersionEnrollment enrollment = enrollmentRepository
            .findByCourseVersion_VersionIdAndUserId(courseVersionId, userId)
            .orElseThrow(() -> new AppException(ErrorCode.ENROLLMENT_NOT_FOUND));

        List<CourseVersionLesson> versionLessons = cvlRepository
            .findByCourseVersion_VersionIdOrderByOrderIndex(courseVersionId);

        if (versionLessons.isEmpty()) return;

        int totalLessons = versionLessons.size();
        int completedCount = 0;

        for (CourseVersionLesson vl : versionLessons) {
            Lesson lesson = vl.getLesson();
            
            Optional<LessonProgress> progressOpt = lessonProgressRepository
                .findById(new LessonProgressId(lesson.getLessonId(), userId));

            if (progressOpt.isPresent()) {
                LessonProgress p = progressOpt.get();
                
                boolean isPassed = p.getScore() >= 50;
                boolean isContentOutdated = false;
                
                if (lesson.getUpdatedAt() != null && p.getCompletedAt() != null) {
                    isContentOutdated = p.getCompletedAt().isBefore(lesson.getUpdatedAt());
                }

                if (isPassed && !isContentOutdated) {
                    completedCount++;
                }
            }
        }

        double newProgress = ((double) completedCount / (double) totalLessons) * 100.0;
        
        newProgress = Math.round(newProgress * 100.0) / 100.0;
        
        if (newProgress > 100.0) newProgress = 100.0;

        enrollment.setProgress(newProgress);
        
        if (newProgress >= 100.0) {
            enrollment.setStatus(CourseVersionEnrollmentStatus.COMPLETED);
            if (enrollment.getCompletedAt() == null) {
                enrollment.setCompletedAt(OffsetDateTime.now());
            }
        } else {
            enrollment.setStatus(CourseVersionEnrollmentStatus.IN_PROGRESS); 
        }
        
        enrollmentRepository.save(enrollment);
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
            
            CourseVersionEnrollmentResponse response = CourseVersionEnrollmentMapper.toResponse(enrollment);
            
            // Logic tính toán completedLessonsCount
            if (enrollment.getCourseVersion() != null) {
                long completedCount = courseVersionEnrollmentRepository.countCompletedLessonsInVersion(userId, enrollment.getCourseVersion().getVersionId());
                response.setCompletedLessonsCount((int) completedCount);
            }
            
            return response;
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