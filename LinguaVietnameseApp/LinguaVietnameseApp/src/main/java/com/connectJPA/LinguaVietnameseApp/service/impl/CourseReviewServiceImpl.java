package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseReviewRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseReviewResponse;
import com.connectJPA.LinguaVietnameseApp.entity.CourseReview;
import com.connectJPA.LinguaVietnameseApp.entity.CourseReviewReaction;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.enums.ReactionType;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.mapper.CourseReviewMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseReviewReactionRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseReviewRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.CourseReviewService;
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
public class CourseReviewServiceImpl implements CourseReviewService {
    private final CourseReviewRepository courseReviewRepository;
    private final CourseReviewReactionRepository reactionRepository;
    private final CourseReviewMapper courseReviewMapper;
    private final UserRepository userRepository;

    @Override
    public Page<CourseReviewResponse> getAllCourseReviews(UUID courseId, UUID currentUserId, BigDecimal rating, Pageable pageable) {
        Page<CourseReview> rootReviews;
        if (rating != null) {
            rootReviews = courseReviewRepository.findByCourseIdAndRatingAndParentIsNullAndIsDeletedFalseOrderByCreatedAtDesc(courseId, rating, pageable);
        } else {
            rootReviews = courseReviewRepository.findByCourseIdAndParentIsNullAndIsDeletedFalseOrderByCreatedAtDesc(courseId, pageable);
        }
        
        List<CourseReviewResponse> dtos = rootReviews.getContent().stream()
                .map(review -> mapToResponseWithPreviewReplies(review, currentUserId))
                .collect(Collectors.toList());

        return new PageImpl<>(dtos, pageable, rootReviews.getTotalElements());
    }

    @Override
    public Page<CourseReviewResponse> getRepliesByParentId(UUID parentId, UUID currentUserId, Pageable pageable) {
        if (!courseReviewRepository.existsById(parentId)) {
            throw new AppException(ErrorCode.COURSE_REVIEW_NOT_FOUND);
        }

        Page<CourseReview> replyPage = courseReviewRepository.findByParentReviewIdAndIsDeletedFalseOrderByCreatedAtAsc(parentId, pageable);
        
        return replyPage.map(review -> mapToResponseWithPreviewReplies(review, currentUserId)); 
    }

    @Override
    @Transactional
    public CourseReviewResponse createCourseReview(CourseReviewRequest request) {
        CourseReview review = new CourseReview();
        review.setCourseId(request.getCourseId());
        review.setUserId(request.getUserId());
        review.setComment(request.getComment());
        review.setLikeCount(0);
        review.setDislikeCount(0);

        if (request.getParentId() != null) {
            // LOGIC QUAN TRỌNG: Nếu là reply, rating phải là null (hoặc bỏ qua)
            // Lưu ý: DTO ở Controller phải cho phép null hoặc 0.
            CourseReview parent = courseReviewRepository.findById(request.getParentId())
                    .orElseThrow(() -> new AppException(ErrorCode.COURSE_REVIEW_NOT_FOUND));
            review.setParent(parent);
            review.setRating(null); // Force null for replies
        } else {
            // Chỉ set rating cho review gốc
            review.setRating(request.getRating());
        }

        review = courseReviewRepository.save(review);
        return mapToResponseBasic(review, request.getUserId());
    }

    @Override
    @Transactional
    public void likeReview(UUID reviewId, UUID userId) {
        CourseReview review = courseReviewRepository.findById(reviewId)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_REVIEW_NOT_FOUND));

        Optional<CourseReviewReaction> existingReaction = reactionRepository.findByUserIdAndReviewId(userId, reviewId);

        if (existingReaction.isPresent()) {
            CourseReviewReaction reaction = existingReaction.get();
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
            CourseReviewReaction newReaction = CourseReviewReaction.builder()
                    .userId(userId)
                    .reviewId(reviewId)
                    .type(ReactionType.LIKE)
                    .build();
            reactionRepository.save(newReaction);
            review.setLikeCount(review.getLikeCount() + 1);
        }
        courseReviewRepository.save(review);
    }

    @Override
    @Transactional
    public void unlikeReview(UUID reviewId, UUID userId) {
        Optional<CourseReviewReaction> existingReaction = reactionRepository.findByUserIdAndReviewId(userId, reviewId);
        if (existingReaction.isPresent() && existingReaction.get().getType() == ReactionType.LIKE) {
             reactionRepository.delete(existingReaction.get());
             CourseReview review = courseReviewRepository.findById(reviewId).orElseThrow();
             review.setLikeCount(Math.max(0, review.getLikeCount() - 1));
             courseReviewRepository.save(review);
        }
    }

    @Override
    @Transactional
    public void dislikeReview(UUID reviewId, UUID userId) {
        CourseReview review = courseReviewRepository.findById(reviewId)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_REVIEW_NOT_FOUND));

        Optional<CourseReviewReaction> existingReaction = reactionRepository.findByUserIdAndReviewId(userId, reviewId);

        if (existingReaction.isPresent()) {
            CourseReviewReaction reaction = existingReaction.get();
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
            CourseReviewReaction newReaction = CourseReviewReaction.builder()
                    .userId(userId)
                    .reviewId(reviewId)
                    .type(ReactionType.DISLIKE)
                    .build();
            reactionRepository.save(newReaction);
            review.setDislikeCount(review.getDislikeCount() + 1);
        }
        courseReviewRepository.save(review);
    }

    @Override
    @Transactional
    public void undislikeReview(UUID reviewId, UUID userId) {
         Optional<CourseReviewReaction> existingReaction = reactionRepository.findByUserIdAndReviewId(userId, reviewId);
         if (existingReaction.isPresent() && existingReaction.get().getType() == ReactionType.DISLIKE) {
             reactionRepository.delete(existingReaction.get());
             CourseReview review = courseReviewRepository.findById(reviewId).orElseThrow();
             review.setDislikeCount(Math.max(0, review.getDislikeCount() - 1));
             courseReviewRepository.save(review);
         }
    }

    private CourseReviewResponse mapToResponseBasic(CourseReview entity, UUID currentViewerId) {
        User user = userRepository.findById(entity.getUserId()).orElse(null);
        long realReplyCount = courseReviewRepository.countByParentReviewIdAndIsDeletedFalse(entity.getReviewId());

        boolean isLiked = false;
        boolean isDisliked = false;

        if (currentViewerId != null) {
            Optional<CourseReviewReaction> reaction = reactionRepository.findByUserIdAndReviewId(currentViewerId, entity.getReviewId());
            if (reaction.isPresent()) {
                if (reaction.get().getType() == ReactionType.LIKE) isLiked = true;
                else if (reaction.get().getType() == ReactionType.DISLIKE) isDisliked = true;
            }
        }

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
                .replyCount(realReplyCount)
                .topReplies(null)
                .isDeleted(entity.isDeleted())
                .isLiked(isLiked)
                .isDisliked(isDisliked)
                .build();
    }

    private CourseReviewResponse mapToResponseWithPreviewReplies(CourseReview entity, UUID currentViewerId) {
        CourseReviewResponse resp = mapToResponseBasic(entity, currentViewerId);
        
        if (resp.getReplyCount() > 0) {
            Page<CourseReview> firstTwoReplies = courseReviewRepository.findByParentReviewIdAndIsDeletedFalseOrderByCreatedAtAsc(
                    entity.getReviewId(), 
                    PageRequest.of(0, 2)
            );
            List<CourseReviewResponse> top2Dtos = firstTwoReplies.getContent().stream()
                    .map(r -> mapToResponseBasic(r, currentViewerId))
                    .collect(Collectors.toList());
            resp.setTopReplies(top2Dtos);
        }
        return resp;
    }

    @Override
    public CourseReviewResponse getCourseReviewByIds(UUID courseId, UUID userId) {
        CourseReview review = courseReviewRepository.findByCourseIdAndUserIdAndIsDeletedFalse(courseId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_REVIEW_NOT_FOUND));
        return mapToResponseWithPreviewReplies(review, userId); 
    }

    @Override
    @Transactional
    public CourseReviewResponse updateCourseReview(UUID courseId, UUID userId, CourseReviewRequest request) {
         CourseReview review = courseReviewRepository.findByCourseIdAndUserIdAndIsDeletedFalse(courseId, userId)
                    .orElseThrow(() -> new AppException(ErrorCode.COURSE_REVIEW_NOT_FOUND));
         courseReviewMapper.updateEntityFromRequest(request, review);
         review = courseReviewRepository.save(review);
         return mapToResponseWithPreviewReplies(review, userId);
    }
    
    @Override
    @Transactional
    public void deleteCourseReview(UUID courseId, UUID userId) {
        CourseReview review = courseReviewRepository.findByCourseIdAndUserIdAndIsDeletedFalse(courseId, userId)
                    .orElseThrow(() -> new AppException(ErrorCode.COURSE_REVIEW_NOT_FOUND));
        review.setDeleted(true);
        courseReviewRepository.save(review);
    }
}