package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.GrammarTopic;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface GrammarTopicRepository extends JpaRepository<GrammarTopic, UUID> {
    List<GrammarTopic> findByIsDeletedFalseOrderByCreatedAtAsc();
}
