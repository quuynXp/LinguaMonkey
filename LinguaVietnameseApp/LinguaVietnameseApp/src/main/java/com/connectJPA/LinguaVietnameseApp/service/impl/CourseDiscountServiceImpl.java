package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseDiscountRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseDiscountResponse;
import com.connectJPA.LinguaVietnameseApp.entity.CourseDiscount;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.mapper.CourseDiscountMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CourseDiscountRepository;
import com.connectJPA.LinguaVietnameseApp.service.CourseDiscountService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CourseDiscountServiceImpl implements CourseDiscountService {
    private final CourseDiscountRepository courseDiscountRepository;
    private final CourseDiscountMapper courseDiscountMapper;
    private final RedisTemplate<String, Object> redisTemplate;

    @Override
    public Page<CourseDiscountResponse> getAllCourseDiscounts(UUID courseId, Integer discountPercentage, Pageable pageable) {
        try {
            Page<CourseDiscount> discounts = courseDiscountRepository.findAllByCourseIdAndDiscountPercentageAndIsDeletedFalse(courseId, discountPercentage, pageable);
            return discounts.map(courseDiscountMapper::toResponse);
        } catch (RedisConnectionFailureException e) {
            throw new AppException(ErrorCode.REDIS_CONNECTION_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public CourseDiscountResponse getCourseDiscountById(UUID id) {
        try {
            CourseDiscount discount = courseDiscountRepository.findById(id)
                    .orElseThrow(() -> new AppException(ErrorCode.COURSE_DISCOUNT_NOT_FOUND));
            return courseDiscountMapper.toResponse(discount);
        } catch (RedisConnectionFailureException e) {
            throw new AppException(ErrorCode.REDIS_CONNECTION_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    //@CacheEvict(value = {"courseDiscounts"}, allEntries = true)
    public CourseDiscountResponse createCourseDiscount(CourseDiscountRequest request) {
        try {
            CourseDiscount discount = courseDiscountMapper.toEntity(request);
            discount = courseDiscountRepository.save(discount);
            return courseDiscountMapper.toResponse(discount);
        } catch (RedisConnectionFailureException e) {
            throw new AppException(ErrorCode.REDIS_CONNECTION_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    //@CachePut(value = "courseDiscount", key = "#id")
    public CourseDiscountResponse updateCourseDiscount(UUID id, CourseDiscountRequest request) {
        try {
            CourseDiscount discount = courseDiscountRepository.findById(id)
                    .orElseThrow(() -> new AppException(ErrorCode.COURSE_DISCOUNT_NOT_FOUND));
            courseDiscountMapper.updateEntityFromRequest(request, discount);
            discount = courseDiscountRepository.save(discount);
            return courseDiscountMapper.toResponse(discount);
        } catch (RedisConnectionFailureException e) {
            throw new AppException(ErrorCode.REDIS_CONNECTION_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    //@CacheEvict(value = "courseDiscount", key = "#id")
    public void deleteCourseDiscount(UUID id) {
        try {
            CourseDiscount discount = courseDiscountRepository.findById(id)
                    .orElseThrow(() -> new AppException(ErrorCode.COURSE_DISCOUNT_NOT_FOUND));
            discount.setDeleted(true);
            courseDiscountRepository.save(discount);
        } catch (RedisConnectionFailureException e) {
            throw new AppException(ErrorCode.REDIS_CONNECTION_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    //@CacheEvict(value = "courseDiscounts", allEntries = true)
    public void deleteCourseDiscountsByCourseId(UUID courseId) {
        try {
            courseDiscountRepository.findAllByCourseIdAndIsDeletedFalse(courseId).forEach(discount -> {
                discount.setDeleted(true);
                courseDiscountRepository.save(discount);
            });
        } catch (RedisConnectionFailureException e) {
            throw new AppException(ErrorCode.REDIS_CONNECTION_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }
}