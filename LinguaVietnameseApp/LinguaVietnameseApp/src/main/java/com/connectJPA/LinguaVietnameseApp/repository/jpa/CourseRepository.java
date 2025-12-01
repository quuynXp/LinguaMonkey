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
    
    // 1. Cập nhật để tìm kiếm theo languageCode của latestPublicVersion
    @Query("SELECT c FROM Course c WHERE LOWER(c.title) LIKE LOWER(CONCAT('%', :title, '%')) " +
           "AND c.latestPublicVersion.languageCode = :languageCode " +
           "AND c.isDeleted = false")
    Page<Course> findByTitleContainingIgnoreCaseAndLanguageCodeAndIsDeletedFalse(@Param("title") String title, @Param("languageCode") String languageCode, Pageable pageable);
    
    Optional<Course> findByCourseIdAndIsDeletedFalse(UUID courseId);
    Page<Course> findByCreatorIdAndIsDeletedFalse(UUID creatorId, Pageable pageable);
    List<Course> findByCreatorIdAndIsDeletedFalse(UUID creatorId);
    
    // 5. Cập nhật để tìm kiếm theo type của latestPublicVersion (Sử dụng HQL)
    // NOTE: Removed the derived query method 'findByTypeAndIsDeletedFalse' which caused the error.
    @Query("SELECT c FROM Course c WHERE c.latestPublicVersion.type = :type AND c.isDeleted = false")
    Page<Course> findCoursesByTypeAndIsDeletedFalse(@Param("type") CourseType type, Pageable pageable);
    
    // Cập nhật để truy vấn latestPublicVersion.thumbnailUrl
    @Query("SELECT c FROM Course c WHERE c.latestPublicVersion.thumbnailUrl IS NULL AND c.createdAt < :threshold")
    List<Course> findTop50ByThumbnailUrlIsNullAndCreatedAtBefore(@Param("threshold") OffsetDateTime threshold);

    // 2. Sửa Native Query: Truy vấn qua latestPublicVersion_id (đã join ngầm)
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
        ORDER BY RANDOM() 
        LIMIT :limit
    """, nativeQuery = true)
    List<Course> findRecommendedCourses(
            @Param("proficiency") String proficiency,
            @Param("languageCode") String languageCode,
            @Param("excluded") List<UUID> excluded,
            @Param("limit") int limit);

    // 3. Cập nhật để tìm kiếm theo languageCode của latestPublicVersion
    @Query("SELECT c FROM Course c WHERE LOWER(c.title) LIKE LOWER(CONCAT('%', :title, '%')) " +
           "AND c.latestPublicVersion.languageCode = :languageCode " +
           "AND c.approvalStatus = :approvalStatus " +
           "AND c.isDeleted = false")
    Page<Course> findByTitleContainingIgnoreCaseAndLanguageCodeAndApprovalStatusAndIsDeletedFalse(
            @Param("title") String title, @Param("languageCode") String languageCode, @Param("approvalStatus") CourseApprovalStatus approvalStatus, Pageable pageable);

    // 4. Cập nhật để tìm kiếm theo difficultyLevel của latestPublicVersion
    @Query("SELECT c FROM Course c WHERE c.latestPublicVersion.difficultyLevel IN :difficultyLevel " +
           "AND c.courseId NOT IN :courseId " +
           "AND c.approvalStatus = :approvalStatus " +
           "AND c.isDeleted = false")
    Page<Course> findByDifficultyLevelInAndCourseIdNotInAndApprovalStatusAndIsDeletedFalse(
            @Param("difficultyLevel") List<String> difficultyLevel, 
            @Param("courseId") List<UUID> courseId, 
            @Param("approvalStatus") CourseApprovalStatus approvalStatus, 
            Pageable pageable
    );

    Page<Course> findByCourseIdNotInAndApprovalStatusAndIsDeletedFalse(
            List<UUID> courseId, 
            CourseApprovalStatus approvalStatus, 
            boolean isDeleted, 
            Pageable pageable
    );

    // 5. Cập nhật để tìm kiếm theo type của latestPublicVersion (Sử dụng HQL)
    @Query("SELECT c FROM Course c WHERE c.latestPublicVersion.type = :type " +
           "AND c.approvalStatus = :approvalStatus " +
           "AND c.isDeleted = false")
    Page<Course> findByTypeAndApprovalStatusAndIsDeletedFalse(@Param("type") CourseType type, @Param("approvalStatus") CourseApprovalStatus approvalStatus, Pageable pageable);

    // 6. Giữ nguyên (description vẫn nằm trong latestPublicVersion)
    @Query("SELECT c FROM Course c WHERE (" +
           "LOWER(c.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(c.latestPublicVersion.description) LIKE LOWER(CONCAT('%', :keyword, '%'))" +
           ") AND c.isDeleted = false AND c.approvalStatus = com.connectJPA.LinguaVietnameseApp.enums.CourseApprovalStatus.APPROVED " +
           "ORDER BY c.createdAt DESC")
    Page<Course> searchCoursesByKeyword(@Param("keyword") String keyword, Pageable pageable);
}