package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.Course;
import com.connectJPA.LinguaVietnameseApp.enums.CourseApprovalStatus;
import com.connectJPA.LinguaVietnameseApp.enums.CourseType;
import com.connectJPA.LinguaVietnameseApp.enums.DifficultyLevel;
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
    
    @Query("SELECT c FROM Course c WHERE LOWER(c.title) LIKE LOWER(CONCAT('%', :title, '%')) " +
           "AND c.latestPublicVersion.languageCode = :languageCode " +
           "AND c.isDeleted = false")
    Page<Course> findByTitleContainingIgnoreCaseAndLanguageCodeAndIsDeletedFalse(@Param("title") String title, @Param("languageCode") String languageCode, Pageable pageable);
    
    Optional<Course> findByCourseIdAndIsDeletedFalse(UUID courseId);
    Page<Course> findByCreatorIdAndIsDeletedFalse(UUID creatorId, Pageable pageable);
    List<Course> findByCreatorIdAndIsDeletedFalse(UUID creatorId);

    List<Course> findByCreatedAtBetweenAndIsDeletedFalse(OffsetDateTime start, OffsetDateTime end);
    long countByCreatedAtBetweenAndIsDeletedFalse(OffsetDateTime start, OffsetDateTime end);

    @Query("SELECT c FROM Course c " +
           "JOIN c.latestPublicVersion cv " +
           "LEFT JOIN CourseVersionEnrollment cve ON cve.courseVersion = cv " +
           "WHERE c.isDeleted = false " +
           "AND c.approvalStatus = com.connectJPA.LinguaVietnameseApp.enums.CourseApprovalStatus.APPROVED " +
           "AND c.latestPublicVersion IS NOT NULL " +
           "GROUP BY c " +
           "ORDER BY COUNT(cve) DESC")
    List<Course> findTopSellingCourses(Pageable pageable);
    
    @Query("SELECT c FROM Course c WHERE c.latestPublicVersion.type = :type AND c.isDeleted = false AND c.latestPublicVersion IS NOT NULL")
    Page<Course> findCoursesByTypeAndIsDeletedFalse(@Param("type") CourseType type, Pageable pageable);
    
    @Query("SELECT c FROM Course c WHERE c.latestPublicVersion.thumbnailUrl IS NULL AND c.createdAt < :threshold")
    List<Course> findTop50ByThumbnailUrlIsNullAndCreatedAtBefore(@Param("threshold") OffsetDateTime threshold);

    @Query("SELECT c FROM Course c WHERE c.courseId NOT IN :excludedIds " +
            "AND c.approvalStatus = :status " +
            "AND c.isDeleted = false " +
            "AND c.latestPublicVersion IS NOT NULL")
    Page<Course> findAllAvailableCourses(
            @Param("excludedIds") List<UUID> excludedIds,
            @Param("status") CourseApprovalStatus status, 
            Pageable pageable
    );

    @Query("SELECT c FROM Course c WHERE c.latestPublicVersion.price > 0 " +
            "AND c.courseId NOT IN :excludedIds " +
            "AND c.approvalStatus = :approvalStatus " +
            "AND c.isDeleted = false " +
            "AND c.latestPublicVersion IS NOT NULL")
    Page<Course> findAvailablePaidCourses(
            @Param("excludedIds") List<UUID> excludedIds,
            @Param("approvalStatus") CourseApprovalStatus approvalStatus, 
            Pageable pageable
    );

    @Query("SELECT c FROM Course c WHERE c.latestPublicVersion.price = 0 " +
            "AND c.courseId NOT IN :excludedIds " +
            "AND c.approvalStatus = :approvalStatus " +
            "AND c.isDeleted = false " +
            "AND c.latestPublicVersion IS NOT NULL")
    Page<Course> findAvailableFreeCourses(
            @Param("excludedIds") List<UUID> excludedIds,
            @Param("approvalStatus") CourseApprovalStatus approvalStatus, 
            Pageable pageable
    );

    @Query(value = """
        SELECT c.* FROM courses c 
        JOIN course_versions cv ON c.latest_public_version_id = cv.version_id
        WHERE c.is_deleted = false 
        AND (
            CAST(:languageCode AS VARCHAR) IS NULL 
            OR cv.language_code = :languageCode
        ) 
        AND (
            CAST(:proficiency AS VARCHAR) IS NULL 
            OR cv.difficulty_level = :proficiency
        ) 
        AND (
            c.course_id NOT IN (:excluded)
        )
        AND c.latest_public_version_id IS NOT NULL
        ORDER BY RANDOM() 
        LIMIT :limit
    """, nativeQuery = true)
    List<Course> findRecommendedCourses(
            @Param("proficiency") String proficiency,
            @Param("languageCode") String languageCode,
            @Param("excluded") List<UUID> excluded,
            @Param("limit") int limit);

    @Query("SELECT c FROM Course c WHERE LOWER(c.title) LIKE LOWER(CONCAT('%', :title, '%')) " +
           "AND c.latestPublicVersion.languageCode = :languageCode " +
           "AND c.approvalStatus = :approvalStatus " +
           "AND c.isDeleted = false " +
           "AND c.latestPublicVersion IS NOT NULL")
    Page<Course> findByTitleContainingIgnoreCaseAndLanguageCodeAndApprovalStatusAndIsDeletedFalse(
            @Param("title") String title, @Param("languageCode") String languageCode, @Param("approvalStatus") CourseApprovalStatus approvalStatus, Pageable pageable);

    @Query("SELECT c FROM Course c WHERE c.latestPublicVersion.difficultyLevel IN :difficultyLevel " +
           "AND c.courseId NOT IN :courseId " +
           "AND c.approvalStatus = :approvalStatus " +
           "AND c.isDeleted = false " +
           "AND c.latestPublicVersion IS NOT NULL")
    Page<Course> findByDifficultyLevelInAndCourseIdNotInAndApprovalStatusAndIsDeletedFalse(
            @Param("difficultyLevel") List<String> difficultyLevel, 
            @Param("courseId") List<UUID> courseId, 
            @Param("approvalStatus") CourseApprovalStatus approvalStatus, 
            Pageable pageable
    );

    @Query("SELECT c FROM Course c WHERE c.courseId NOT IN :courseId " +
            "AND c.approvalStatus = :approvalStatus " +
            "AND c.isDeleted = false " +
            "AND c.latestPublicVersion IS NOT NULL")
    Page<Course> findByCourseIdNotInAndApprovalStatusAndIsDeletedFalse(
            @Param("courseId") List<UUID> courseId, 
            @Param("approvalStatus") CourseApprovalStatus approvalStatus, 
            Pageable pageable
    );

    @Query("SELECT c FROM Course c WHERE c.latestPublicVersion.type = :type " +
           "AND c.approvalStatus = :approvalStatus " +
           "AND c.isDeleted = false " +
           "AND c.latestPublicVersion IS NOT NULL")
    Page<Course> findByTypeAndApprovalStatusAndIsDeletedFalse(@Param("type") CourseType type, @Param("approvalStatus") CourseApprovalStatus approvalStatus, Pageable pageable);

    @Query("SELECT c FROM Course c WHERE (" +
           "LOWER(c.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(c.latestPublicVersion.description) LIKE LOWER(CONCAT('%', :keyword, '%'))" +
           ") AND c.isDeleted = false AND c.approvalStatus = com.connectJPA.LinguaVietnameseApp.enums.CourseApprovalStatus.APPROVED " +
           "AND c.latestPublicVersion IS NOT NULL " +
           "ORDER BY c.createdAt DESC")
    Page<Course> searchCoursesByKeyword(@Param("keyword") String keyword, Pageable pageable);

    @Query("SELECT c FROM Course c WHERE c.isAdminCreated = true " +
           "AND c.approvalStatus = :approved " +
           "AND c.isDeleted = false " +
           "AND c.latestPublicVersion IS NOT NULL")
    Page<Course> findByIsAdminCreatedTrueAndApprovalStatusAndIsDeletedFalse(@Param("approved") CourseApprovalStatus approved,
            Pageable pageable);

    @Query("SELECT c FROM Course c WHERE c.approvalStatus = :status " +
           "AND c.isDeleted = false " +
           "AND c.latestPublicVersion IS NOT NULL")
    Page<Course> findByApprovalStatusAndIsDeletedFalse(@Param("status") CourseApprovalStatus status, Pageable pageable);

    List<Course> findByLatestPublicVersion_DifficultyLevelAndApprovalStatus(DifficultyLevel diffLevel,
            CourseApprovalStatus approved);
}