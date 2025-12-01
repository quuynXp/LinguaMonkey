package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseVersionDiscountRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseVersionDiscountResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface CourseVersionDiscountService {
    Page<CourseVersionDiscountResponse> getAllCourseVersionDiscounts(UUID versionId, Integer discountPercentage, Pageable pageable);
    CourseVersionDiscountResponse getCourseVersionDiscountById(UUID id);
    CourseVersionDiscountResponse createCourseVersionDiscount(CourseVersionDiscountRequest request);
    CourseVersionDiscountResponse updateCourseVersionDiscount(UUID id, CourseVersionDiscountRequest request);
    void deleteCourseVersionDiscount(UUID id);
    void deleteDiscountsByCourseId(UUID courseId);
    CourseVersionDiscountResponse validateDiscountCode(String code, UUID versionId);
}