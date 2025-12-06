package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.CourseVersion;
import com.connectJPA.LinguaVietnameseApp.enums.VersionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CourseVersionRepository extends JpaRepository<CourseVersion, UUID> {

    Optional<CourseVersion> findByVersionIdAndStatus(UUID versionId, VersionStatus status);

    Optional<CourseVersion> findTopByCourseIdAndStatusOrderByVersionNumberDesc(UUID courseId, VersionStatus status);

    Optional<CourseVersion> findTopByCourseIdAndIsDeletedFalseOrderByVersionNumberDesc(UUID courseId);

    List<CourseVersion> findByCourseIdAndStatusAndIsDeletedFalse(UUID courseId, VersionStatus status);

    List<CourseVersion> findByCourseIdAndIsDeletedFalse(UUID courseId);

    @Query("SELECT cv FROM CourseVersion cv WHERE cv.courseId = :courseId " +
            "AND cv.status = 'PUBLIC' " +
            "ORDER BY cv.versionNumber DESC")
    Optional<CourseVersion> findLatestPublicVersionByCourseId(@Param("courseId") UUID courseId);

    List<CourseVersion> findByStatusAndPublishedAtBeforeAndIsDeletedFalse(String status, OffsetDateTime now);

    boolean existsByCourseIdAndStatus(UUID courseId, VersionStatus status);

    @Query("SELECT cv FROM CourseVersion cv " +
           "JOIN Course c ON cv.courseId = c.courseId " +
           "JOIN User u ON c.creatorId = u.userId " +
           "WHERE cv.status = 'DRAFT' " +
           "AND (cv.isIntegrityValid IS NULL OR cv.isContentValid IS NULL) " +
           "ORDER BY u.isVip DESC, cv.createdAt ASC")
    List<CourseVersion> findDraftsPendingValidationSortedByPriority();
    
    @Query("SELECT cv FROM CourseVersion cv WHERE cv.status = 'DRAFT' AND (cv.isIntegrityValid IS NULL OR cv.isContentValid IS NULL)")
    List<CourseVersion> findDraftsPendingValidation();

    @Query("SELECT cv FROM CourseVersion cv WHERE cv.status = 'PUBLIC' AND cv.isSystemReviewed = false")
    List<CourseVersion> findPublicVersionsPendingSystemReview();
}