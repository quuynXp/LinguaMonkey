package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseDiscountRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseDiscountResponse;
import com.connectJPA.LinguaVietnameseApp.service.CourseDiscountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/course-discounts")
@RequiredArgsConstructor
public class CourseDiscountController {
    private final CourseDiscountService courseDiscountService;
    private final MessageSource messageSource;

    @Operation(summary = "Get all course discounts", description = "Retrieve a paginated list of course discounts with optional filtering by courseId or discountPercentage")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved course discounts"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters")
    })
    @GetMapping
    public AppApiResponse<Page<CourseDiscountResponse>> getAllCourseDiscounts(
            @Parameter(description = "Course ID filter") @RequestParam(required = false) UUID courseId,
            @Parameter(description = "Discount percentage filter") @RequestParam(required = false) Integer discountPercentage,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        Page<CourseDiscountResponse> discounts = courseDiscountService.getAllCourseDiscounts(courseId, discountPercentage, pageable);
        return AppApiResponse.<Page<CourseDiscountResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("courseDiscount.list.success", null, locale))
                .result(discounts)
                .build();
    }

    @Operation(summary = "Get course discount by ID", description = "Retrieve a course discount by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved course discount"),
            @ApiResponse(responseCode = "404", description = "Course discount not found")
    })
    @GetMapping("/{id}")
    public AppApiResponse<CourseDiscountResponse> getCourseDiscountById(
            @Parameter(description = "Course discount ID") @PathVariable UUID id,
            Locale locale) {
        CourseDiscountResponse discount = courseDiscountService.getCourseDiscountById(id);
        return AppApiResponse.<CourseDiscountResponse>builder()
                .code(200)
                .message(messageSource.getMessage("courseDiscount.get.success", null, locale))
                .result(discount)
                .build();
    }

    @Operation(summary = "Create a new course discount", description = "Create a new course discount with the provided details")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Course discount created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid course discount data")
    })
    @PostMapping
    public AppApiResponse<CourseDiscountResponse> createCourseDiscount(
            @Valid @RequestBody CourseDiscountRequest request,
            Locale locale) {
        CourseDiscountResponse discount = courseDiscountService.createCourseDiscount(request);
        return AppApiResponse.<CourseDiscountResponse>builder()
                .code(201)
                .message(messageSource.getMessage("courseDiscount.created.success", null, locale))
                .result(discount)
                .build();
    }

    @Operation(summary = "Update a course discount", description = "Update an existing course discount by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Course discount updated successfully"),
            @ApiResponse(responseCode = "404", description = "Course discount not found"),
            @ApiResponse(responseCode = "400", description = "Invalid course discount data")
    })
    @PutMapping("/{id}")
    public AppApiResponse<CourseDiscountResponse> updateCourseDiscount(
            @Parameter(description = "Course discount ID") @PathVariable UUID id,
            @Valid @RequestBody CourseDiscountRequest request,
            Locale locale) {
        CourseDiscountResponse discount = courseDiscountService.updateCourseDiscount(id, request);
        return AppApiResponse.<CourseDiscountResponse>builder()
                .code(200)
                .message(messageSource.getMessage("courseDiscount.updated.success", null, locale))
                .result(discount)
                .build();
    }

    @Operation(summary = "Delete a course discount", description = "Soft delete a course discount by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Course discount deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Course discount not found")
    })
    @DeleteMapping("/{id}")
    public AppApiResponse<Void> deleteCourseDiscount(
            @Parameter(description = "Course discount ID") @PathVariable UUID id,
            Locale locale) {
        courseDiscountService.deleteCourseDiscount(id);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("courseDiscount.deleted.success", null, locale))
                .build();
    }

    @Operation(summary = "Validate a coupon code", description = "Check if a discount code is valid for a course")
    @GetMapping("/validate")
    public AppApiResponse<CourseDiscountResponse> validateDiscount(
            @RequestParam String code,
            @RequestParam UUID courseId,
            Locale locale
    ) {
        CourseDiscountResponse discount = courseDiscountService.validateDiscountCode(code, courseId);
        return AppApiResponse.<CourseDiscountResponse>builder()
                .code(200)
                .message(messageSource.getMessage("courseDiscount.get.success", null, locale))
                .result(discount)
                .build();
    }
}