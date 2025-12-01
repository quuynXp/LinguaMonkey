package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseVersionReviewRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseVersionReviewResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Course;
import com.connectJPA.LinguaVietnameseApp.entity.CourseVersionEnrollment;
import com.connectJPA.LinguaVietnameseApp.entity.CourseVersionReview;
import com.connectJPA.LinguaVietnameseApp.entity.CourseVersionReviewReaction;
import com.connectJPA.LinguaVietnameseApp.entity.CourseVersion;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.enums.ReactionType;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.mapper.CourseVersionReviewMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseVersionEnrollmentRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseVersionReviewReactionRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseVersionReviewRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseVersionRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.CourseVersionReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CourseVersionReviewServiceImpl implements CourseVersionReviewService {
    private final CourseVersionReviewRepository courseVersionReviewRepository;
    private final CourseVersionReviewReactionRepository reactionRepository;
    private final CourseRepository courseRepository;
    private final CourseVersionRepository courseVersionRepository;
    private final CourseVersionEnrollmentRepository enrollmentRepository;
    private final CourseVersionReviewMapper CourseVersionReviewMapper;
    private final UserRepository userRepository;

    @Override
    public Page<CourseVersionReviewResponse> getAllCourseVersionReviews(UUID courseId, UUID currentUserId, BigDecimal rating, Pageable pageable) {
        Page<CourseVersionReview> rootReviews;
        if (rating != null) {
            rootReviews = courseVersionReviewRepository.findByCourseIdAndRatingAndParentIsNullAndIsDeletedFalseOrderByCreatedAtDesc(courseId, rating, pageable);
        } else {
            rootReviews = courseVersionReviewRepository.findByCourseIdAndParentIsNullAndIsDeletedFalseOrderByCreatedAtDesc(courseId, pageable);
        }
        
        List<CourseVersionReviewResponse> dtos = rootReviews.getContent().stream()
                .map(review -> mapToResponseWithPreviewReplies(review, currentUserId))
                .collect(Collectors.toList());

        return new PageImpl<>(dtos, pageable, rootReviews.getTotalElements());
    }

    @Override
    public Page<CourseVersionReviewResponse> getRepliesByParentId(UUID parentId, UUID currentUserId, Pageable pageable) {
        if (!courseVersionReviewRepository.existsById(parentId)) {
            throw new AppException(ErrorCode.COURSE_REVIEW_NOT_FOUND);
        }

        Page<CourseVersionReview> replyPage = courseVersionReviewRepository.findByParentReviewIdAndIsDeletedFalseOrderByCreatedAtAsc(parentId, pageable);
        
        return replyPage.map(review -> mapToResponseWithPreviewReplies(review, currentUserId)); 
    }

    @Override
    @Transactional
    public CourseVersionReviewResponse createCourseVersionReview(CourseVersionReviewRequest request) {
        Course course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_FOUND));

        CourseVersion version = courseVersionRepository.findLatestPublicVersionByCourseId(request.getCourseId())
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_VERSION_NOT_FOUND));

        validateReviewPermission(request.getCourseId(), request.getUserId());

        CourseVersionReview review = new CourseVersionReview();
        review.setCourseId(request.getCourseId());
        review.setCourseVersion(version);
        review.setUserId(request.getUserId());
        review.setComment(request.getComment());
        review.setLikeCount(0);
        review.setDislikeCount(0);

        if (request.getParentId() != null) {
            CourseVersionReview parent = courseVersionReviewRepository.findById(request.getParentId())
                    .orElseThrow(() -> new AppException(ErrorCode.COURSE_REVIEW_NOT_FOUND));
            review.setParent(parent);
            review.setRating(null);
        } else {
            review.setRating(request.getRating());
        }

        review = courseVersionReviewRepository.save(review);
        return mapToResponseBasic(review, request.getUserId());
    }

    private void validateReviewPermission(UUID courseId, UUID userId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_FOUND));

        if (course.getLatestPublicVersion().getPrice().compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        Optional<CourseVersionEnrollment> enrollmentOpt = enrollmentRepository.findByCourseVersion_Course_CourseIdAndUserIdAndIsDeletedFalse(courseId, userId);
        
        if (enrollmentOpt.isEmpty()) {
            throw new AppException(ErrorCode.REVIEW_NOT_ALLOWED);
        }

        CourseVersionEnrollment enrollment = enrollmentOpt.get();
        if (enrollment.getProgress() < 50) {
            throw new AppException(ErrorCode.REVIEW_NOT_ALLOWED);
        }
    }

    @Override
    @Transactional
    public void likeReview(UUID reviewId, UUID userId) {
        CourseVersionReview review = courseVersionReviewRepository.findById(reviewId)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_REVIEW_NOT_FOUND));

        Optional<CourseVersionReviewReaction> existingReaction = reactionRepository.findByUserIdAndReviewId(userId, reviewId);

        if (existingReaction.isPresent()) {
            CourseVersionReviewReaction reaction = existingReaction.get();
            if (reaction.getType() == ReactionType.LIKE) {
                reactionRepository.delete(reaction);
                review.setLikeCount(Math.max(0, review.getLikeCount() - 1));
            } else {
                reaction.setType(ReactionType.LIKE);
                reactionRepository.save(reaction);
                review.setDislikeCount(Math.max(0, review.getDislikeCount() - 1));
                review.setLikeCount(review.getLikeCount() + 1);
            }
        } else {
            CourseVersionReviewReaction newReaction = CourseVersionReviewReaction.builder()
                    .userId(userId)
                    .reviewId(reviewId)
                    .type(ReactionType.LIKE)
                    .build();
            reactionRepository.save(newReaction);
            review.setLikeCount(review.getLikeCount() + 1);
        }
        courseVersionReviewRepository.save(review);
    }

    @Override
    @Transactional
    public void unlikeReview(UUID reviewId, UUID userId) {
        Optional<CourseVersionReviewReaction> existingReaction = reactionRepository.findByUserIdAndReviewId(userId, reviewId);
        if (existingReaction.isPresent() && existingReaction.get().getType() == ReactionType.LIKE) {
             reactionRepository.delete(existingReaction.get());
             CourseVersionReview review = courseVersionReviewRepository.findById(reviewId).orElseThrow();
             review.setLikeCount(Math.max(0, review.getLikeCount() - 1));
             courseVersionReviewRepository.save(review);
        }
    }

    @Override
    @Transactional
    public void dislikeReview(UUID reviewId, UUID userId) {
        CourseVersionReview review = courseVersionReviewRepository.findById(reviewId)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_REVIEW_NOT_FOUND));

        Optional<CourseVersionReviewReaction> existingReaction = reactionRepository.findByUserIdAndReviewId(userId, reviewId);

        if (existingReaction.isPresent()) {
            CourseVersionReviewReaction reaction = existingReaction.get();
            if (reaction.getType() == ReactionType.DISLIKE) {
                reactionRepository.delete(reaction);
                review.setDislikeCount(Math.max(0, review.getDislikeCount() - 1));
            } else {
                reaction.setType(ReactionType.DISLIKE);
                reactionRepository.save(reaction);
                review.setLikeCount(Math.max(0, review.getLikeCount() - 1));
                review.setDislikeCount(review.getDislikeCount() + 1);
            }
        } else {
            CourseVersionReviewReaction newReaction = CourseVersionReviewReaction.builder()
                    .userId(userId)
                    .reviewId(reviewId)
                    .type(ReactionType.DISLIKE)
                    .build();
            reactionRepository.save(newReaction);
            review.setDislikeCount(review.getDislikeCount() + 1);
        }
        courseVersionReviewRepository.save(review);
    }

    @Override
    @Transactional
    public void undislikeReview(UUID reviewId, UUID userId) {
          Optional<CourseVersionReviewReaction> existingReaction = reactionRepository.findByUserIdAndReviewId(userId, reviewId);
          if (existingReaction.isPresent() && existingReaction.get().getType() == ReactionType.DISLIKE) {
              reactionRepository.delete(existingReaction.get());
              CourseVersionReview review = courseVersionReviewRepository.findById(reviewId).orElseThrow();
              review.setDislikeCount(Math.max(0, review.getDislikeCount() - 1));
              courseVersionReviewRepository.save(review);
          }
    }

    private CourseVersionReviewResponse mapToResponseBasic(CourseVersionReview entity, UUID currentViewerId) {
        User user = userRepository.findById(entity.getUserId()).orElse(null);
        long realReplyCount = courseVersionReviewRepository.countByParentReviewIdAndIsDeletedFalse(entity.getReviewId());

        boolean isLiked = false;
        boolean isDisliked = false;

        if (currentViewerId != null) {
            Optional<CourseVersionReviewReaction> reaction = reactionRepository.findByUserIdAndReviewId(currentViewerId, entity.getReviewId());
            if (reaction.isPresent()) {
                if (reaction.get().getType() == ReactionType.LIKE) isLiked = true;
                else if (reaction.get().getType() == ReactionType.DISLIKE) isDisliked = true;
            }
        }

        return CourseVersionReviewResponse.builder()
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
                .replyCount(realReplyCount)
                .topReplies(null)
                .isDeleted(entity.isDeleted())
                .isLiked(isLiked)
                .isDisliked(isDisliked)
                .build();
    }

    private CourseVersionReviewResponse mapToResponseWithPreviewReplies(CourseVersionReview entity, UUID currentViewerId) {
        CourseVersionReviewResponse resp = mapToResponseBasic(entity, currentViewerId);
        
        if (resp.getReplyCount() > 0) {
            Page<CourseVersionReview> firstTwoReplies = courseVersionReviewRepository.findByParentReviewIdAndIsDeletedFalseOrderByCreatedAtAsc(
                    entity.getReviewId(), 
                    PageRequest.of(0, 2)
            );
            List<CourseVersionReviewResponse> top2Dtos = firstTwoReplies.getContent().stream()
                    .map(r -> mapToResponseBasic(r, currentViewerId))
                    .collect(Collectors.toList());
            resp.setTopReplies(top2Dtos);
        }
        return resp;
    }

    @Override
    public CourseVersionReviewResponse getCourseVersionReviewByIds(UUID courseId, UUID userId) {
        CourseVersionReview review = courseVersionReviewRepository.findByCourseIdAndUserIdAndIsDeletedFalse(courseId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_REVIEW_NOT_FOUND));
        return mapToResponseWithPreviewReplies(review, userId); 
    }

    @Override
    @Transactional
    public CourseVersionReviewResponse updateCourseVersionReview(UUID courseId, UUID userId, CourseVersionReviewRequest request) {
         CourseVersionReview review = courseVersionReviewRepository.findByCourseIdAndUserIdAndIsDeletedFalse(courseId, userId)
                    .orElseThrow(() -> new AppException(ErrorCode.COURSE_REVIEW_NOT_FOUND));
         CourseVersionReviewMapper.updateEntityFromRequest(request, review);
         review = courseVersionReviewRepository.save(review);
         return mapToResponseWithPreviewReplies(review, userId);
    }
    
    @Override
    @Transactional
    public void deleteCourseVersionReview(UUID courseId, UUID userId) {
        CourseVersionReview review = courseVersionReviewRepository.findByCourseIdAndUserIdAndIsDeletedFalse(courseId, userId)
                    .orElseThrow(() -> new AppException(ErrorCode.COURSE_REVIEW_NOT_FOUND));
        review.setDeleted(true);
        courseVersionReviewRepository.save(review);
    }
}