package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.GrammarLesson;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GrammarLessonRepository extends JpaRepository<GrammarLesson, UUID> {

    List<GrammarLesson> findByTopicIdAndIsDeletedFalseOrderByCreatedAtAsc(UUID topicId);

}