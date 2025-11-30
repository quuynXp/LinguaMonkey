package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseReviewRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseReviewResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.PageResponse;
import com.connectJPA.LinguaVietnameseApp.service.CourseReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/course-reviews")
@RequiredArgsConstructor
public class CourseReviewController {
    private final CourseReviewService courseReviewService;
    private final MessageSource messageSource;

    @Operation(summary = "Get all course reviews", description = "Retrieve a paginated list of course reviews with optional filtering. Pass 'userId' to check if that user liked/disliked comments.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved course reviews"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters")
    })
    @GetMapping
    public AppApiResponse<Page<CourseReviewResponse>> getAllCourseReviews(
            @Parameter(description = "Course ID filter") @RequestParam(required = false) UUID courseId,
            @Parameter(description = "Current User ID (to check like status)") @RequestParam(required = false) UUID userId,
            @Parameter(description = "Rating filter") @RequestParam(required = false) BigDecimal rating,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        
        // userId ở đây đóng vai trò là "currentViewerId"
        Page<CourseReviewResponse> reviews = courseReviewService.getAllCourseReviews(courseId, userId, rating, pageable);
        
        return AppApiResponse.<Page<CourseReviewResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("courseReview.list.success", null, locale))
                .result(reviews)
                .build();
    }

    @Operation(summary = "Get replies for a review", description = "Retrieve replies for a specific review. Pass 'userId' to check like status.")
    @GetMapping("/{reviewId}/replies")
    public ResponseEntity<AppApiResponse<PageResponse<CourseReviewResponse>>> getReviewReplies(
            @PathVariable UUID reviewId,
            @Parameter(description = "Current User ID (to check like status)") @RequestParam(required = false) UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        
        // Truyền userId xuống service để check like status cho các reply
        Page<CourseReviewResponse> result = courseReviewService.getRepliesByParentId(reviewId, userId, pageable);
        
        return ResponseEntity.ok(AppApiResponse.<PageResponse<CourseReviewResponse>>builder()
                .code(200)
                .message("Replies fetched successfully")
                .result(mapToPageResponse(result))
                .build());
    }

    private <T> PageResponse<T> mapToPageResponse(Page<T> page) {
        return PageResponse.<T>builder()
                .content(page.getContent())
                .pageNumber(page.getNumber())
                .pageSize(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .isLast(page.isLast())
                .isFirst(page.isFirst())
                .hasNext(page.hasNext())
                .hasPrevious(page.hasPrevious())
                .build();
    }

    @GetMapping("/{courseId}/{userId}")
    public AppApiResponse<CourseReviewResponse> getCourseReviewByIds(
            @PathVariable UUID courseId,
            @PathVariable UUID userId,
            Locale locale) {
        CourseReviewResponse review = courseReviewService.getCourseReviewByIds(courseId, userId);
        return AppApiResponse.<CourseReviewResponse>builder()
                .code(200)
                .message(messageSource.getMessage("courseReview.get.success", null, locale))
                .result(review)
                .build();
    }

    @PostMapping
    public AppApiResponse<CourseReviewResponse> createCourseReview(
            @Valid @RequestBody CourseReviewRequest request,
            Locale locale) {
        CourseReviewResponse review = courseReviewService.createCourseReview(request);
        return AppApiResponse.<CourseReviewResponse>builder()
                .code(201)
                .message(messageSource.getMessage("courseReview.created.success", null, locale))
                .result(review)
                .build();
    }

    @PostMapping("/{reviewId}/like")
    public AppApiResponse<Void> likeReview(@PathVariable UUID reviewId, @RequestParam UUID userId) {
        courseReviewService.likeReview(reviewId, userId);
        return AppApiResponse.<Void>builder().code(200).message("Liked successfully").build();
    }

    @PostMapping("/{reviewId}/unlike")
    public AppApiResponse<Void> unlikeReview(@PathVariable UUID reviewId, @RequestParam UUID userId) {
        courseReviewService.unlikeReview(reviewId, userId);
        return AppApiResponse.<Void>builder().code(200).message("Unliked successfully").build();
    }

    @PostMapping("/{reviewId}/dislike")
    public AppApiResponse<Void> dislikeReview(@PathVariable UUID reviewId, @RequestParam UUID userId) {
        courseReviewService.dislikeReview(reviewId, userId);
        return AppApiResponse.<Void>builder().code(200).message("Disliked successfully").build();
    }

    @PostMapping("/{reviewId}/undislike")
    public AppApiResponse<Void> undislikeReview(@PathVariable UUID reviewId, @RequestParam UUID userId) {
        courseReviewService.undislikeReview(reviewId, userId);
        return AppApiResponse.<Void>builder().code(200).message("Undisliked successfully").build();
    }

    @PutMapping("/{courseId}/{userId}")
    public AppApiResponse<CourseReviewResponse> updateCourseReview(
            @PathVariable UUID courseId,
            @PathVariable UUID userId,
            @Valid @RequestBody CourseReviewRequest request,
            Locale locale) {
        CourseReviewResponse review = courseReviewService.updateCourseReview(courseId, userId, request);
        return AppApiResponse.<CourseReviewResponse>builder()
                .code(200)
                .message(messageSource.getMessage("courseReview.updated.success", null, locale))
                .result(review)
                .build();
    }

    @DeleteMapping("/{courseId}/{userId}")
    public AppApiResponse<Void> deleteCourseReview(
            @PathVariable UUID courseId,
            @PathVariable UUID userId,
            Locale locale) {
        courseReviewService.deleteCourseReview(courseId, userId);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("courseReview.deleted.success", null, locale))
                .build();
    }
}