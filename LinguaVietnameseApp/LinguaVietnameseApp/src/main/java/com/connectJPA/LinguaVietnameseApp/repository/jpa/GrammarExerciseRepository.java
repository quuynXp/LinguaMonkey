package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.GrammarExercise;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface GrammarExerciseRepository extends JpaRepository<GrammarExercise, UUID> {
    List<GrammarExercise> findByRuleIdAndIsDeletedFalseOrderByCreatedAtAsc(UUID ruleId);
}
