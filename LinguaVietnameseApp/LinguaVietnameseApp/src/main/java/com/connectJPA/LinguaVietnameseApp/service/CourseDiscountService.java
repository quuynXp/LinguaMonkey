package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseDiscountRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseDiscountResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface CourseDiscountService {
    Page<CourseDiscountResponse> getAllCourseDiscounts(UUID courseId, Integer discountPercentage, Pageable pageable);
    CourseDiscountResponse getCourseDiscountById(UUID id);
    CourseDiscountResponse createCourseDiscount(CourseDiscountRequest request);
    CourseDiscountResponse updateCourseDiscount(UUID id, CourseDiscountRequest request);
    void deleteCourseDiscountsByCourseId(UUID courseId);
    void deleteCourseDiscount(UUID id);
    CourseDiscountResponse validateDiscountCode(String code, UUID courseId);
}
