package com.connectJPA.LinguaVietnameseApp.repository;

import com.connectJPA.LinguaVietnameseApp.entity.Course;
import com.connectJPA.LinguaVietnameseApp.entity.CourseEnrollment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import javax.crypto.spec.OAEPParameterSpec;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CourseEnrollmentRepository extends JpaRepository<CourseEnrollment, UUID> {
    Page<CourseEnrollment> findAllByCourseIdAndUserIdAndIsDeletedFalse(UUID courseId, UUID userId, Pageable pageable);

    int countByUserIdAndEnrolledAtBetween(UUID userId, OffsetDateTime start, OffsetDateTime end );
    Page<CourseEnrollment> findByUserId(UUID userId, Pageable pageable);
    List<CourseEnrollment> findByUserId(UUID userId);
    Optional<CourseEnrollment> findByCourseIdAndUserIdAndIsDeletedFalse(UUID courseId, UUID userId);

    List<CourseEnrollment> findByEnrolledAtBetween(OffsetDateTime start, OffsetDateTime end);

    List<CourseEnrollment> findByUserIdAndEnrolledAtBetween(UUID userId, OffsetDateTime start, OffsetDateTime end);

    List<CourseEnrollment> findByCourseIdAndIsDeletedFalse(UUID courseId);

    List<CourseEnrollment> findByCourseIdAndEnrolledAtBetween(UUID courseIds, OffsetDateTime start, OffsetDateTime end);

    List<CourseEnrollment> findByCourseIdIn(List<UUID> courseIds);

    List<CourseEnrollment> findByCourseIdInAndEnrolledAtBetween(List<UUID> courseIds, OffsetDateTime start, OffsetDateTime end);

}
