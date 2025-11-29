package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseReviewRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseReviewResponse;
import com.connectJPA.LinguaVietnameseApp.entity.CourseReview;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.mapper.CourseReviewMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseReviewRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.CourseReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CourseReviewServiceImpl implements CourseReviewService {
    private final CourseReviewRepository courseReviewRepository;
    private final CourseReviewMapper courseReviewMapper;
    private final RedisTemplate<String, Object> redisTemplate;
    private final UserRepository userRepository;

    @Override
    public Page<CourseReviewResponse> getAllCourseReviews(UUID courseId, UUID userId, BigDecimal rating, Pageable pageable) {
        Page<CourseReview> rootReviews = courseReviewRepository.findByCourseIdAndParentIsNullAndIsDeletedFalseOrderByCreatedAtDesc(courseId, pageable);
        
        List<CourseReviewResponse> dtos = rootReviews.getContent().stream()
                .map(this::mapToResponseWithPreviewReplies) // Dùng hàm map đặc biệt để lấy preview
                .collect(Collectors.toList());

        return new PageImpl<>(dtos, pageable, rootReviews.getTotalElements());
    }

    @Override
    public Page<CourseReviewResponse> getRepliesByParentId(UUID parentId, Pageable pageable) {
        if (!courseReviewRepository.existsById(parentId)) {
            throw new AppException(ErrorCode.COURSE_REVIEW_NOT_FOUND);
        }

        Page<CourseReview> replyPage = courseReviewRepository.findByParentReviewIdAndIsDeletedFalseOrderByCreatedAtAsc(parentId, pageable);
        
        return replyPage.map(this::mapToResponseBasic);
    }


    @Override
    @Transactional
    public CourseReviewResponse createCourseReview(CourseReviewRequest request) {
        CourseReview review = new CourseReview();
        review.setCourseId(request.getCourseId());
        review.setUserId(request.getUserId());
        review.setRating(request.getRating());
        review.setComment(request.getComment());
        review.setLikeCount(0);
        review.setDislikeCount(0);

        if (request.getParentId() != null) {
            CourseReview parent = courseReviewRepository.findById(request.getParentId())
                    .orElseThrow(() -> new AppException(ErrorCode.COURSE_REVIEW_NOT_FOUND));
            review.setParent(parent);
        }

        review = courseReviewRepository.save(review);
        return mapToResponseWithPreviewReplies(review);
    }


    private CourseReviewResponse mapToResponseBasic(CourseReview entity) {
        User user = userRepository.findById(entity.getUserId()).orElse(null);
        return CourseReviewResponse.builder()
                .reviewId(entity.getReviewId())
                .courseId(entity.getCourseId())
                .userId(entity.getUserId())
                .userFullname(user != null ? (user.getFullname() != null ? user.getFullname() : user.getNickname()) : "Unknown")
                .userAvatar(user != null ? user.getAvatarUrl() : null)
                .userNickname(user != null ? user.getNickname() : "")
                .rating(entity.getRating())
                .comment(entity.getComment())
                .likeCount(entity.getLikeCount())
                .dislikeCount(entity.getDislikeCount())
                .parentId(entity.getParent() != null ? entity.getParent().getReviewId() : null)
                .reviewedAt(entity.getCreatedAt())
                .replyCount(0)
                .topReplies(null)
                .isDeleted(entity.isDeleted())
                .build();
    }

    private CourseReviewResponse mapToResponseWithPreviewReplies(CourseReview entity) {
        CourseReviewResponse resp = mapToResponseBasic(entity);
        
        long totalReplies = courseReviewRepository.countByParentReviewIdAndIsDeletedFalse(entity.getReviewId());
        resp.setReplyCount(totalReplies);

        if (totalReplies > 0) {
            Page<CourseReview> firstTwoReplies = courseReviewRepository.findByParentReviewIdAndIsDeletedFalseOrderByCreatedAtAsc(
                    entity.getReviewId(), 
                    PageRequest.of(0, 2)
            );
            
            List<CourseReviewResponse> top2Dtos = firstTwoReplies.getContent().stream()
                    .map(this::mapToResponseBasic)
                    .collect(Collectors.toList());
            
            resp.setTopReplies(top2Dtos);
        }

        return resp;
    }

    @Override
    // //@Cacheable(value = "courseReview", key = "#courseId + ':' + #userId")
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
    //@CachePut(value = "courseReview", key = "#courseId + ':' + #userId")
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
    //@CacheEvict(value = "courseReview", key = "#courseId + ':' + #userId")
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