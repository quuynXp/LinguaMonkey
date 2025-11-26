package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.Course;
import com.connectJPA.LinguaVietnameseApp.enums.CourseApprovalStatus;
import com.connectJPA.LinguaVietnameseApp.enums.CourseType;
import com.connectJPA.LinguaVietnameseApp.enums.ProficiencyLevel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CourseRepository extends JpaRepository<Course, UUID> {
    Page<Course> findByTitleContainingIgnoreCaseAndLanguageCodeAndIsDeletedFalse(String title, String languageCode, Pageable pageable);
    Optional<Course> findByCourseIdAndIsDeletedFalse(UUID courseId);
    Page<Course> findByCreatorIdAndIsDeletedFalse(UUID creatorId, Pageable pageable);
    Page<Course> findByTypeAndIsDeletedFalse(CourseType type, Pageable pageable);
    List<Course> findByCreatorIdAndIsDeletedFalse(UUID creatorId);
    List<Course> findTop50ByThumbnailUrlIsNullAndCreatedAtBefore(OffsetDateTime threshold);

    // FIX: Sử dụng CAST(... AS VARCHAR) để tránh lỗi "could not determine data type" của Postgres
    @Query(value = """
        SELECT * FROM courses c WHERE c.is_deleted = false 
        AND (
            CAST(:languageCode AS VARCHAR) IS NULL 
            OR c.language_code = :languageCode
        ) 
        AND (
            CAST(:proficiency AS VARCHAR) IS NULL 
            OR c.difficulty_level = :proficiency
        ) 
        AND (
            c.course_id NOT IN (:excluded)
        )
        ORDER BY RANDOM() 
        LIMIT :limit
    """, nativeQuery = true)
    List<Course> findRecommendedCourses(
            @Param("proficiency") String proficiency, // Đổi sang String để Hibernate binding chính xác với VARCHAR
            @Param("languageCode") String languageCode,
            @Param("excluded") List<UUID> excluded,
            @Param("limit") int limit);

    Page<Course> findByTitleContainingIgnoreCaseAndLanguageCodeAndApprovalStatusAndIsDeletedFalse(
            String title, String languageCode, CourseApprovalStatus approvalStatus, Pageable pageable);

    Page<Course> findByTypeAndApprovalStatusAndIsDeletedFalse(CourseType type, CourseApprovalStatus approvalStatus, Pageable pageable);

    @Query("""
      SELECT c FROM Course c JOIN CourseDiscount d ON c.courseId = d.courseId 
      WHERE c.isDeleted = false AND d.isActive = true AND d.startDate <= CURRENT_TIMESTAMP AND d.endDate >= CURRENT_TIMESTAMP 
      """)
    Page<Course> findDiscountedCourses(Pageable pageable);

    @Query("SELECT c FROM Course c WHERE (" +
            "LOWER(c.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(c.latestPublicVersion.description) LIKE LOWER(CONCAT('%', :keyword, '%'))" +
            ") AND c.isDeleted = false AND c.approvalStatus = com.connectJPA.LinguaVietnameseApp.enums.CourseApprovalStatus.APPROVED " +
            "ORDER BY c.createdAt DESC")
    Page<Course> searchCoursesByKeyword(@Param("keyword") String keyword, Pageable pageable);
}