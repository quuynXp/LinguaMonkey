package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.CourseVersionDiscount;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CourseVersionDiscountRepository extends JpaRepository<CourseVersionDiscount, UUID> {
    
    Page<CourseVersionDiscount> findAllByCourseVersion_VersionIdAndDiscountPercentageAndIsDeletedFalse(UUID versionId, Integer discountPercentage, Pageable pageable);
    
    List<CourseVersionDiscount> findAllByCourseVersion_VersionIdAndIsDeletedFalse(UUID versionId);
    
    Optional<CourseVersionDiscount> findByCodeAndCourseVersion_VersionIdAndIsDeletedFalse(String code, UUID versionId);

    List<CourseVersionDiscount> findAllByCourseVersion_CourseId(@Param("courseId") UUID courseId);

    @Modifying
    @Query("UPDATE CourseVersionDiscount d SET d.isActive = true WHERE d.isDeleted = false AND d.isActive = false AND d.startDate <= :now AND (d.endDate IS NULL OR d.endDate >= :now)")
    int activateDiscounts(@Param("now") OffsetDateTime now);

    @Modifying
    @Query("UPDATE CourseVersionDiscount d SET d.isActive = false WHERE d.isDeleted = false AND d.isActive = true AND d.endDate IS NOT NULL AND d.endDate < :now")
    int deactivateDiscounts(@Param("now") OffsetDateTime now);

    @Query("SELECT d FROM CourseVersionDiscount d " +
            "JOIN FETCH d.courseVersion v " +
            "JOIN FETCH v.course c " +
            "WHERE d.isActive = true " +
            "AND d.isDeleted = false " +
            "AND d.startDate <= :now " +
            "AND (d.endDate IS NULL OR d.endDate >= :now) " +
            "AND c.isDeleted = false " +
            "AND v.status = 'PUBLIC' " +
            "AND (:keyword IS NULL OR LOWER(c.title) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
            "AND (:languageCode IS NULL OR v.languageCode = :languageCode) " +
            "AND (:minRating IS NULL OR v.systemRating >= :minRating) " +
            "ORDER BY d.discountPercentage DESC")
    Page<CourseVersionDiscount> findSpecialOffers(
            @Param("keyword") String keyword,
            @Param("languageCode") String languageCode,
            @Param("minRating") Float minRating,
            @Param("now") OffsetDateTime now,
            Pageable pageable
    );
}