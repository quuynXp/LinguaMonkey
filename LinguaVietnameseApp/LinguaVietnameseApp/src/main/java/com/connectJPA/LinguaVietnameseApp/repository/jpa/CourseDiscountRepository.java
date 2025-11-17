package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.CourseDiscount;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface CourseDiscountRepository extends JpaRepository<CourseDiscount, UUID> {
    Page<CourseDiscount> findAllByCourseIdAndDiscountPercentageAndIsDeletedFalse(UUID courseId, Integer discountPercentage, Pageable pageable);
    List<CourseDiscount> findAllByCourseIdAndIsDeletedFalse(UUID courseId);


    @Modifying
    @Query("UPDATE CourseDiscount d SET d.isActive = true WHERE d.isDeleted = false AND d.isActive = false AND d.startDate <= :now AND (d.endDate IS NULL OR d.endDate >= :now)")
    int activateDiscounts(@Param("now") OffsetDateTime now);

    @Modifying
    @Query("UPDATE CourseDiscount d SET d.isActive = false WHERE d.isDeleted = false AND d.isActive = true AND d.endDate IS NOT NULL AND d.endDate < :now")
    int deactivateDiscounts(@Param("now") OffsetDateTime now);

}
