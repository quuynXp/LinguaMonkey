package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseReviewRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseReviewResponse;
import com.connectJPA.LinguaVietnameseApp.entity.CourseReview;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.mapper.CourseReviewMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseReviewRepository;
import com.connectJPA.LinguaVietnameseApp.service.CourseReviewService;
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

import java.math.BigDecimal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CourseReviewServiceImpl implements CourseReviewService {
    private final CourseReviewRepository courseReviewRepository;
    private final CourseReviewMapper courseReviewMapper;
    private final RedisTemplate<String, Object> redisTemplate;

    @Override
    @Cacheable(value = "courseReviews", key = "#courseId + ':' + #userId + ':' + #rating + ':' + #pageable")
    public Page<CourseReviewResponse> getAllCourseReviews(UUID courseId, UUID userId, BigDecimal rating, Pageable pageable) {
        try {
            Page<CourseReview> reviews = courseReviewRepository.findAllByCourseIdAndUserIdAndRatingAndIsDeletedFalse(courseId, userId, rating, pageable);
            return reviews.map(courseReviewMapper::toResponse);
        } catch (RedisConnectionFailureException e) {
            throw new AppException(ErrorCode.REDIS_CONNECTION_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Cacheable(value = "courseReview", key = "#courseId + ':' + #userId")
    public CourseReviewResponse getCourseReviewByIds(UUID courseId, UUID userId) {
        try {
            CourseReview review = courseReviewRepository.findByCourseIdAndUserIdAndIsDeletedFalse(courseId, userId)
                    .orElseThrow(() -> new AppException(ErrorCode.COURSE_REVIEW_NOT_FOUND));
            return courseReviewMapper.toResponse(review);
        } catch (RedisConnectionFailureException e) {
            throw new AppException(ErrorCode.REDIS_CONNECTION_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = {"courseReviews"}, allEntries = true)
    public CourseReviewResponse createCourseReview(CourseReviewRequest request) {
        try {
            CourseReview review = courseReviewMapper.toEntity(request);
            review = courseReviewRepository.save(review);
            return courseReviewMapper.toResponse(review);
        } catch (RedisConnectionFailureException e) {
            throw new AppException(ErrorCode.REDIS_CONNECTION_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CachePut(value = "courseReview", key = "#courseId + ':' + #userId")
    public CourseReviewResponse updateCourseReview(UUID courseId, UUID userId, CourseReviewRequest request) {
        try {
            CourseReview review = courseReviewRepository.findByCourseIdAndUserIdAndIsDeletedFalse(courseId, userId)
                    .orElseThrow(() -> new AppException(ErrorCode.COURSE_REVIEW_NOT_FOUND));
            courseReviewMapper.updateEntityFromRequest(request, review);
            review = courseReviewRepository.save(review);
            return courseReviewMapper.toResponse(review);
        } catch (RedisConnectionFailureException e) {
            throw new AppException(ErrorCode.REDIS_CONNECTION_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = "courseReview", key = "#courseId + ':' + #userId")
    public void deleteCourseReview(UUID courseId, UUID userId) {
        try {
            CourseReview review = courseReviewRepository.findByCourseIdAndUserIdAndIsDeletedFalse(courseId, userId)
                    .orElseThrow(() -> new AppException(ErrorCode.COURSE_REVIEW_NOT_FOUND));
            review.setDeleted(true);
            courseReviewRepository.save(review);
        } catch (RedisConnectionFailureException e) {
            throw new AppException(ErrorCode.REDIS_CONNECTION_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }
}