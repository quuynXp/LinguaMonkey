package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseVersionDiscountRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseVersionDiscountResponse;
import com.connectJPA.LinguaVietnameseApp.entity.CourseVersion;
import com.connectJPA.LinguaVietnameseApp.entity.CourseVersionDiscount;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.mapper.CourseVersionDiscountMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseVersionDiscountRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseVersionRepository;
import com.connectJPA.LinguaVietnameseApp.service.CourseVersionDiscountService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CourseVersionDiscountServiceImpl implements CourseVersionDiscountService {
    private final CourseVersionDiscountRepository courseVersionDiscountRepository;
    private final CourseVersionDiscountMapper courseVersionDiscountMapper;
    private final CourseVersionRepository courseVersionRepository;

    @Override
    public Page<CourseVersionDiscountResponse> getAllCourseVersionDiscounts(UUID versionId, Integer discountPercentage, Pageable pageable) {
        return courseVersionDiscountRepository.findAllByVersionIdAndDiscountPercentageAndIsDeletedFalse(versionId, discountPercentage, pageable)
                .map(courseVersionDiscountMapper::toResponse);
    }

    @Override
    public CourseVersionDiscountResponse getCourseVersionDiscountById(UUID id) {
        CourseVersionDiscount discount = courseVersionDiscountRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_DISCOUNT_NOT_FOUND));
        return courseVersionDiscountMapper.toResponse(discount);
    }

    @Override
    @Transactional
    public CourseVersionDiscountResponse createCourseVersionDiscount(CourseVersionDiscountRequest request) {
        if (!courseVersionRepository.existsById(request.getVersionId())) {
             throw new AppException(ErrorCode.COURSE_VERSION_NOT_FOUND);
        }

        CourseVersionDiscount discount = courseVersionDiscountMapper.toEntity(request);
        discount = courseVersionDiscountRepository.save(discount);
        return courseVersionDiscountMapper.toResponse(discount);
    }

    @Override
    @Transactional
    public CourseVersionDiscountResponse updateCourseVersionDiscount(UUID id, CourseVersionDiscountRequest request) {
        CourseVersionDiscount discount = courseVersionDiscountRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_DISCOUNT_NOT_FOUND));
        
        courseVersionDiscountMapper.updateEntityFromRequest(request, discount);
        discount = courseVersionDiscountRepository.save(discount);
        return courseVersionDiscountMapper.toResponse(discount);
    }

    @Override
    @Transactional
    public void deleteCourseVersionDiscount(UUID id) {
        CourseVersionDiscount discount = courseVersionDiscountRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_DISCOUNT_NOT_FOUND));
        discount.setDeleted(true);
        courseVersionDiscountRepository.save(discount);
    }

    @Override
    @Transactional
    public void deleteDiscountsByCourseId(UUID courseId) {
        courseVersionDiscountRepository.findAllByCourseVersion_CourseId(courseId).forEach(discount -> {
            discount.setDeleted(true);
            courseVersionDiscountRepository.save(discount);
        });
    }

    @Override
    public CourseVersionDiscountResponse validateDiscountCode(String code, UUID versionId) {
        CourseVersionDiscount discount = courseVersionDiscountRepository.findByCodeAndVersionIdAndIsDeletedFalse(code, versionId)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_DISCOUNT_NOT_FOUND));

        OffsetDateTime now = OffsetDateTime.now();

        if (!Boolean.TRUE.equals(discount.getIsActive())) {
             throw new AppException(ErrorCode.COURSE_DISCOUNT_NOT_FOUND);
        }
        if (discount.getStartDate() != null && discount.getStartDate().isAfter(now)) {
            throw new AppException(ErrorCode.COURSE_DISCOUNT_NOT_FOUND);
        }
        if (discount.getEndDate() != null && discount.getEndDate().isBefore(now)) {
            throw new AppException(ErrorCode.COURSE_DISCOUNT_NOT_FOUND);
        }

        return courseVersionDiscountMapper.toResponse(discount);
    }
}