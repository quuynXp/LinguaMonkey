package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.GrammarRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface GrammarRuleRepository extends JpaRepository<GrammarRule, UUID> {
    List<GrammarRule> findByTopicIdAndIsDeletedFalseOrderByCreatedAtAsc(UUID topicId);
}
