package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.CourseEnrollment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CourseEnrollmentRepository extends JpaRepository<CourseEnrollment, UUID> {
    Page<CourseEnrollment> findAllByCourseVersion_Course_CourseIdAndUserIdAndIsDeletedFalse(UUID courseId, UUID userId, Pageable pageable);

    List<CourseEnrollment> findByUserIdAndIsDeletedFalse(UUID userId);
    int countByUserIdAndEnrolledAtBetween(UUID userId, OffsetDateTime start, OffsetDateTime end );
    Page<CourseEnrollment> findByUserId(UUID userId, Pageable pageable);
    List<CourseEnrollment> findByUserId(UUID userId);
    Optional<CourseEnrollment> findByCourseVersion_Course_CourseIdAndUserIdAndIsDeletedFalse(UUID courseId, UUID userId);

    List<CourseEnrollment> findByEnrolledAtBetween(OffsetDateTime start, OffsetDateTime end);

    List<CourseEnrollment> findByUserIdAndEnrolledAtBetween(UUID userId, OffsetDateTime start, OffsetDateTime end);

    List<CourseEnrollment> findByCourseVersion_Course_CourseIdAndIsDeletedFalse(UUID courseId);
    
    List<CourseEnrollment> findByCourseVersion_Course_CourseIdAndEnrolledAtBetween(UUID courseIds, OffsetDateTime start, OffsetDateTime end);

    List<CourseEnrollment> findByCourseVersion_Course_CourseIdIn(List<UUID> courseIds);

    @Query("""
            SELECT DISTINCT ce.userId FROM CourseEnrollment ce
            WHERE ce.courseVersion.course.courseId = :courseId 
            AND ce.isDeleted = false 
            AND ce.status = 'active'
            """)
    List<UUID> findActiveUserIdsByCourseId(@Param("courseId") UUID courseId);

    List<CourseEnrollment> findByCourseVersion_Course_CourseIdInAndEnrolledAtBetween(List<UUID> courseIds, OffsetDateTime start, OffsetDateTime end);

}
