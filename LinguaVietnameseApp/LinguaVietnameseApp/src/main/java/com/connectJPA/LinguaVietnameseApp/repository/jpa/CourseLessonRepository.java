package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.CourseLesson;
import com.connectJPA.LinguaVietnameseApp.entity.id.CourseLessonId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CourseLessonRepository extends JpaRepository<CourseLesson, CourseLessonId> {
    Page<CourseLesson> findAllByIdCourseIdAndIdLessonIdAndIsDeletedFalse(UUID courseId, UUID lessonId, Pageable pageable);

    Optional<CourseLesson> findByIdCourseIdAndIdLessonIdAndIsDeletedFalse(UUID courseId, UUID lessonId);

}
