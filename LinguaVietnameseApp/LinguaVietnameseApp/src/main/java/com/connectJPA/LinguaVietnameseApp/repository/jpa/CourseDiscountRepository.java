package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.CourseDiscount;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CourseDiscountRepository extends JpaRepository<CourseDiscount, UUID> {
    Page<CourseDiscount> findAllByCourseIdAndDiscountPercentageAndIsDeletedFalse(UUID courseId, Integer discountPercentage, Pageable pageable);
    List<CourseDiscount> findAllByCourseIdAndIsDeletedFalse(UUID courseId);

}
