package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.CourseVersionEnrollment;
import com.connectJPA.LinguaVietnameseApp.enums.CourseVersionEnrollmentStatus;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CourseVersionEnrollmentRepository extends JpaRepository<CourseVersionEnrollment, UUID> {
    
    @Query("SELECT ce FROM CourseVersionEnrollment ce JOIN FETCH ce.courseVersion cv JOIN FETCH cv.course c " +
           "WHERE (:courseId IS NULL OR c.courseId = :courseId) AND (:userId IS NULL OR ce.userId = :userId) AND ce.isDeleted = false")
    Page<CourseVersionEnrollment> findAllByCourseVersion_Course_CourseIdAndUserIdAndIsDeletedFalse(
        @Param("courseId") UUID courseId, 
        @Param("userId") UUID userId, 
        Pageable pageable);

        @Query("SELECT ce FROM CourseVersionEnrollment ce " +
           "JOIN FETCH ce.user u " + 
           "JOIN FETCH ce.courseVersion cv " +
           "JOIN FETCH cv.course c " +
           "WHERE ce.progress < 100 " +
           "AND ce.updatedAt < :threshold " +
           "AND ce.isDeleted = false")
    List<CourseVersionEnrollment> findStalledEnrollments(@Param("threshold") OffsetDateTime threshold);

    @Query("SELECT ce FROM CourseVersionEnrollment ce JOIN FETCH ce.courseVersion cv JOIN FETCH cv.course c " +
           "WHERE ce.userId = :userId AND ce.isDeleted = false")
    Page<CourseVersionEnrollment> findByUserId(@Param("userId") UUID userId, Pageable pageable);

    @Query("SELECT ce FROM CourseVersionEnrollment ce JOIN FETCH ce.courseVersion cv JOIN FETCH cv.course c " +
           "WHERE ce.userId = :userId AND ce.isDeleted = false")
    List<CourseVersionEnrollment> findByUserId(@Param("userId") UUID userId);

    @Query("SELECT ce FROM CourseVersionEnrollment ce JOIN FETCH ce.courseVersion cv JOIN FETCH cv.course c " +
           "WHERE c.courseId = :courseId AND ce.userId = :userId AND ce.isDeleted = false")
    Optional<CourseVersionEnrollment> findByCourseVersion_Course_CourseIdAndUserIdAndIsDeletedFalse(
        @Param("courseId") UUID courseId, 
        @Param("userId") UUID userId);
    
    List<CourseVersionEnrollment> findByUserIdAndIsDeletedFalse(UUID userId);
    int countByUserIdAndEnrolledAtBetween(UUID userId, OffsetDateTime start, OffsetDateTime end );
    
    Optional<CourseVersionEnrollment> findByCourseVersion_VersionIdAndUserIdAndIsDeletedFalse(UUID versionId, UUID userId);

    List<CourseVersionEnrollment> findByEnrolledAtBetween(OffsetDateTime start, OffsetDateTime end);

    List<CourseVersionEnrollment> findByUserIdAndEnrolledAtBetween(UUID userId, OffsetDateTime start, OffsetDateTime end);

    List<CourseVersionEnrollment> findByCourseVersion_Course_CourseIdAndIsDeletedFalse(UUID courseId);

    List<CourseVersionEnrollment> findByCourseVersion_Course_CourseIdAndEnrolledAtBetween(UUID courseId, OffsetDateTime start, OffsetDateTime end);

    List<CourseVersionEnrollment> findByCourseVersion_Course_CourseIdIn(List<UUID> courseIds);

    @Query("""
            SELECT DISTINCT ce.userId FROM CourseVersionEnrollment ce
            WHERE ce.courseVersion.course.courseId = :courseId 
            AND ce.isDeleted = false 
            AND ce.status = 'active'
            """)
    List<UUID> findActiveUserIdsByCourseId(@Param("courseId") UUID courseId);

    List<CourseVersionEnrollment> findByCourseVersion_Course_CourseIdInAndEnrolledAtBetween(List<UUID> courseIds, OffsetDateTime start, OffsetDateTime end);

    Optional<CourseVersionEnrollment> findByCourseVersion_VersionIdAndUserId(UUID versionId, UUID userId);

    @Query("SELECT ce FROM CourseVersionEnrollment ce " +
            "JOIN ce.courseVersion cv " +
            "JOIN cv.lessons cvl " +
            "WHERE ce.userId = :userId " +
            "AND cvl.id.lessonId = :lessonId " +
            "AND ce.status = 'ACTIVE'")
    List<CourseVersionEnrollment> findActiveEnrollmentsByUserIdAndLessonId(@Param("userId") UUID userId, @Param("lessonId") UUID lessonId);

    @Query("SELECT COUNT(cvl) FROM CourseVersionLesson cvl WHERE cvl.id.versionId = :versionId")
    long countLessonsInVersion(@Param("versionId") UUID versionId);

       @Query("""
       SELECT COUNT(lp)
       FROM LessonProgress lp
       JOIN CourseVersionLesson cvl ON lp.id.lessonId = cvl.id.lessonId
       WHERE lp.id.userId = :userId
       AND cvl.id.versionId = :versionId
       AND lp.completedAt IS NOT NULL
       AND lp.isDeleted = false
       """)
       long countCompletedLessonsInVersion(@Param("userId") UUID userId,
                                          @Param("versionId") UUID versionId);

       boolean existsByUserIdAndCourseVersion_VersionId(UUID userId, UUID courseVersionId);


       boolean existsByCourseVersion_VersionIdAndUserIdAndStatus(UUID versionId, UUID userId, CourseVersionEnrollmentStatus status);
       
       // --- New Methods for Creator Dashboard ---

    @Query("SELECT COUNT(DISTINCT ce.userId) FROM CourseVersionEnrollment ce " +
           "JOIN ce.courseVersion cv JOIN cv.course c " +
           "WHERE c.creatorId = :creatorId AND ce.isDeleted = false")
    long countStudentsByCreatorId(@Param("creatorId") UUID creatorId);

    @Query("SELECT COALESCE(SUM(cv.price), 0) FROM CourseVersionEnrollment ce " +
           "JOIN ce.courseVersion cv JOIN cv.course c " +
           "WHERE c.creatorId = :creatorId " +
           "AND ce.enrolledAt BETWEEN :start AND :end " +
           "AND ce.isDeleted = false")
    BigDecimal sumRevenueByCreatorIdAndDateRange(@Param("creatorId") UUID creatorId, 
                                                 @Param("start") OffsetDateTime start, 
                                                 @Param("end") OffsetDateTime end);

       @Query("SELECT COUNT(DISTINCT ce.userId) FROM CourseVersionEnrollment ce " +
            "JOIN ce.courseVersion cv JOIN cv.course c " +
            "WHERE c.courseId = :courseId AND ce.isDeleted = false")
    long countStudentsByCourseId(@Param("courseId") UUID courseId);

    @Query("SELECT COALESCE(SUM(cv.price), 0) FROM CourseVersionEnrollment ce " +
            "JOIN ce.courseVersion cv JOIN cv.course c " +
            "WHERE c.courseId = :courseId " +
            "AND ce.enrolledAt BETWEEN :start AND :end " +
            "AND ce.isDeleted = false")
    BigDecimal sumRevenueByCourseIdAndDateRange(@Param("courseId") UUID courseId,
                                                 @Param("start") OffsetDateTime start,
                                                 @Param("end") OffsetDateTime end);

    List<CourseVersionEnrollment> findByCourseVersion_CourseIdAndIsDeletedFalse(UUID courseId);
}