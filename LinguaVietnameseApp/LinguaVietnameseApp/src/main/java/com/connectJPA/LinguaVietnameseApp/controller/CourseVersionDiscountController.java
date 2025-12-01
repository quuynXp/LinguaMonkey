package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseVersionDiscountRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseVersionDiscountResponse;
import com.connectJPA.LinguaVietnameseApp.service.CourseVersionDiscountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/course-version-discounts")
@RequiredArgsConstructor
public class CourseVersionDiscountController {
    private final CourseVersionDiscountService courseVersionDiscountService;
    private final MessageSource messageSource;

    @Operation(summary = "Get all course version discounts", description = "Retrieve a paginated list of discounts filtered by versionId")
    @GetMapping
    public AppApiResponse<Page<CourseVersionDiscountResponse>> getAllCourseVersionDiscounts(
            @Parameter(description = "Version ID filter") @RequestParam(required = false) UUID versionId,
            @Parameter(description = "Discount percentage filter") @RequestParam(required = false) Integer discountPercentage,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        Page<CourseVersionDiscountResponse> discounts = courseVersionDiscountService.getAllCourseVersionDiscounts(versionId, discountPercentage, pageable);
        return AppApiResponse.<Page<CourseVersionDiscountResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("courseDiscount.list.success", null, locale))
                .result(discounts)
                .build();
    }

    @Operation(summary = "Get course version discount by ID")
    @GetMapping("/{id}")
    public AppApiResponse<CourseVersionDiscountResponse> getCourseVersionDiscountById(
            @PathVariable UUID id,
            Locale locale) {
        CourseVersionDiscountResponse discount = courseVersionDiscountService.getCourseVersionDiscountById(id);
        return AppApiResponse.<CourseVersionDiscountResponse>builder()
                .code(200)
                .message(messageSource.getMessage("courseDiscount.get.success", null, locale))
                .result(discount)
                .build();
    }

    @Operation(summary = "Create a new course version discount")
    @PostMapping
    public AppApiResponse<CourseVersionDiscountResponse> createCourseVersionDiscount(
            @Valid @RequestBody CourseVersionDiscountRequest request,
            Locale locale) {
        CourseVersionDiscountResponse discount = courseVersionDiscountService.createCourseVersionDiscount(request);
        return AppApiResponse.<CourseVersionDiscountResponse>builder()
                .code(201)
                .message(messageSource.getMessage("courseDiscount.created.success", null, locale))
                .result(discount)
                .build();
    }

    @Operation(summary = "Update a course version discount")
    @PutMapping("/{id}")
    public AppApiResponse<CourseVersionDiscountResponse> updateCourseVersionDiscount(
            @PathVariable UUID id,
            @Valid @RequestBody CourseVersionDiscountRequest request,
            Locale locale) {
        CourseVersionDiscountResponse discount = courseVersionDiscountService.updateCourseVersionDiscount(id, request);
        return AppApiResponse.<CourseVersionDiscountResponse>builder()
                .code(200)
                .message(messageSource.getMessage("courseDiscount.updated.success", null, locale))
                .result(discount)
                .build();
    }

    @Operation(summary = "Delete a course version discount")
    @DeleteMapping("/{id}")
    public AppApiResponse<Void> deleteCourseVersionDiscount(
            @PathVariable UUID id,
            Locale locale) {
        courseVersionDiscountService.deleteCourseVersionDiscount(id);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("courseDiscount.deleted.success", null, locale))
                .build();
    }

    @Operation(summary = "Validate a coupon code for a version")
    @GetMapping("/validate")
    public AppApiResponse<CourseVersionDiscountResponse> validateDiscount(
            @RequestParam String code,
            @RequestParam UUID versionId,
            Locale locale
    ) {
        CourseVersionDiscountResponse discount = courseVersionDiscountService.validateDiscountCode(code, versionId);
        return AppApiResponse.<CourseVersionDiscountResponse>builder()
                .code(200)
                .message(messageSource.getMessage("courseDiscount.get.success", null, locale))
                .result(discount)
                .build();
    }
}