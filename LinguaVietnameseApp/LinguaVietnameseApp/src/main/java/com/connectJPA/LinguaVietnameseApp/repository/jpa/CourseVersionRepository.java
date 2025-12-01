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

    Optional<CourseVersion> findTopByCourse_CourseIdAndStatusOrderByVersionNumberDesc(UUID courseId, VersionStatus status);

    Optional<CourseVersion> findTopByCourse_CourseIdAndIsDeletedFalseOrderByVersionNumberDesc(UUID courseId);

    List<CourseVersion> findByCourse_CourseIdAndStatusAndIsDeletedFalse(UUID courseId, VersionStatus status);

    List<CourseVersion> findByCourse_CourseIdAndIsDeletedFalse(UUID courseId);

    @Query("SELECT cv FROM CourseVersion cv WHERE cv.course.courseId = :courseId " +
            "AND cv.status = 'PUBLIC' " +
            "ORDER BY cv.versionNumber DESC")
    Optional<CourseVersion> findLatestPublicVersionByCourseId(@Param("courseId") UUID courseId);

    List<CourseVersion> findByStatusAndPublishedAtBeforeAndIsDeletedFalse(String status, OffsetDateTime now);

    boolean existsByCourse_CourseIdAndStatus(UUID courseId, VersionStatus status);

    @Query("SELECT cv FROM CourseVersion cv WHERE cv.status = 'DRAFT' AND (cv.isIntegrityValid IS NULL OR cv.isContentValid IS NULL)")
    List<CourseVersion> findDraftsPendingValidation();

    @Query("SELECT cv FROM CourseVersion cv WHERE cv.status = 'PUBLIC' AND cv.isSystemReviewed = false")
    List<CourseVersion> findPublicVersionsPendingSystemReview();
}