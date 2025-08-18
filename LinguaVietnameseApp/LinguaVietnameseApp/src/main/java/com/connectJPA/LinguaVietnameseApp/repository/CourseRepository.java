package com.connectJPA.LinguaVietnameseApp.repository;

import com.connectJPA.LinguaVietnameseApp.entity.Course;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CourseRepository extends JpaRepository<Course, UUID> {
    Page<Course> findByTitleContainingIgnoreCaseAndLanguageCodeAndIsDeletedFalse(String title, String languageCode, Pageable pageable);
    Optional<Course> findByCourseIdAndIsDeletedFalse(UUID courseId);
}
