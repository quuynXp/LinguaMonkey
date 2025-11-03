package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.BasicLesson;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface BasicLessonRepository extends JpaRepository<BasicLesson, UUID> {
    Page<BasicLesson> findByLanguageCodeAndLessonType(String languageCode, String lessonType, Pageable pageable);
}
