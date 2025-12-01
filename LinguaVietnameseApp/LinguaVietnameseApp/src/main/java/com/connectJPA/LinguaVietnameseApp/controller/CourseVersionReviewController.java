package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseVersionReviewRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseVersionReviewResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.PageResponse;
import com.connectJPA.LinguaVietnameseApp.service.CourseVersionReviewService;
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
@RequestMapping("/api/v1/course-version-reviews")
@RequiredArgsConstructor
public class CourseVersionReviewController {
    private final CourseVersionReviewService CourseVersionReviewService;
    private final MessageSource messageSource;

    @Operation(summary = "Get all course reviews", description = "Retrieve a paginated list of course reviews with optional filtering. Pass 'userId' to check if that user liked/disliked comments.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved course reviews"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters")
    })
    @GetMapping
    public AppApiResponse<Page<CourseVersionReviewResponse>> getAllCourseVersionReviews(
            @Parameter(description = "Course ID filter") @RequestParam(required = false) UUID courseId,
            @Parameter(description = "Current User ID (to check like status)") @RequestParam(required = false) UUID userId,
            @Parameter(description = "Rating filter") @RequestParam(required = false) BigDecimal rating,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        
        // userId ở đây đóng vai trò là "currentViewerId"
        Page<CourseVersionReviewResponse> reviews = CourseVersionReviewService.getAllCourseVersionReviews(courseId, userId, rating, pageable);
        
        return AppApiResponse.<Page<CourseVersionReviewResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("CourseVersionReview.list.success", null, locale))
                .result(reviews)
                .build();
    }

    @Operation(summary = "Get replies for a review", description = "Retrieve replies for a specific review. Pass 'userId' to check like status.")
    @GetMapping("/{reviewId}/replies")
    public ResponseEntity<AppApiResponse<PageResponse<CourseVersionReviewResponse>>> getReviewReplies(
            @PathVariable UUID reviewId,
            @Parameter(description = "Current User ID (to check like status)") @RequestParam(required = false) UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        
        // Truyền userId xuống service để check like status cho các reply
        Page<CourseVersionReviewResponse> result = CourseVersionReviewService.getRepliesByParentId(reviewId, userId, pageable);
        
        return ResponseEntity.ok(AppApiResponse.<PageResponse<CourseVersionReviewResponse>>builder()
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
    public AppApiResponse<CourseVersionReviewResponse> getCourseVersionReviewByIds(
            @PathVariable UUID courseId,
            @PathVariable UUID userId,
            Locale locale) {
        CourseVersionReviewResponse review = CourseVersionReviewService.getCourseVersionReviewByIds(courseId, userId);
        return AppApiResponse.<CourseVersionReviewResponse>builder()
                .code(200)
                .message(messageSource.getMessage("CourseVersionReview.get.success", null, locale))
                .result(review)
                .build();
    }

    @PostMapping
    public AppApiResponse<CourseVersionReviewResponse> createCourseVersionReview(
            @Valid @RequestBody CourseVersionReviewRequest request,
            Locale locale) {
        CourseVersionReviewResponse review = CourseVersionReviewService.createCourseVersionReview(request);
        return AppApiResponse.<CourseVersionReviewResponse>builder()
                .code(201)
                .message(messageSource.getMessage("CourseVersionReview.created.success", null, locale))
                .result(review)
                .build();
    }

    @PostMapping("/{reviewId}/like")
    public AppApiResponse<Void> likeReview(@PathVariable UUID reviewId, @RequestParam UUID userId) {
        CourseVersionReviewService.likeReview(reviewId, userId);
        return AppApiResponse.<Void>builder().code(200).message("Liked successfully").build();
    }

    @PostMapping("/{reviewId}/unlike")
    public AppApiResponse<Void> unlikeReview(@PathVariable UUID reviewId, @RequestParam UUID userId) {
        CourseVersionReviewService.unlikeReview(reviewId, userId);
        return AppApiResponse.<Void>builder().code(200).message("Unliked successfully").build();
    }

    @PostMapping("/{reviewId}/dislike")
    public AppApiResponse<Void> dislikeReview(@PathVariable UUID reviewId, @RequestParam UUID userId) {
        CourseVersionReviewService.dislikeReview(reviewId, userId);
        return AppApiResponse.<Void>builder().code(200).message("Disliked successfully").build();
    }

    @PostMapping("/{reviewId}/undislike")
    public AppApiResponse<Void> undislikeReview(@PathVariable UUID reviewId, @RequestParam UUID userId) {
        CourseVersionReviewService.undislikeReview(reviewId, userId);
        return AppApiResponse.<Void>builder().code(200).message("Undisliked successfully").build();
    }

    @PutMapping("/{courseId}/{userId}")
    public AppApiResponse<CourseVersionReviewResponse> updateCourseVersionReview(
            @PathVariable UUID courseId,
            @PathVariable UUID userId,
            @Valid @RequestBody CourseVersionReviewRequest request,
            Locale locale) {
        CourseVersionReviewResponse review = CourseVersionReviewService.updateCourseVersionReview(courseId, userId, request);
        return AppApiResponse.<CourseVersionReviewResponse>builder()
                .code(200)
                .message(messageSource.getMessage("CourseVersionReview.updated.success", null, locale))
                .result(review)
                .build();
    }

    @DeleteMapping("/{courseId}/{userId}")
    public AppApiResponse<Void> deleteCourseVersionReview(
            @PathVariable UUID courseId,
            @PathVariable UUID userId,
            Locale locale) {
        CourseVersionReviewService.deleteCourseVersionReview(courseId, userId);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("CourseVersionReview.deleted.success", null, locale))
                .build();
    }
}