package com.connectJPA.LinguaVietnameseApp.repository;

import com.connectJPA.LinguaVietnameseApp.entity.CourseEnrollment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import javax.crypto.spec.OAEPParameterSpec;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CourseEnrollmentRepository extends JpaRepository<CourseEnrollment, UUID> {
    Page<CourseEnrollment> findAllByCourseIdAndUserIdAndIsDeletedFalse(UUID courseId, UUID userId, Pageable pageable);

    Optional<CourseEnrollment> findByCourseIdAndUserIdAndIsDeletedFalse(UUID courseId, UUID userId);
}
