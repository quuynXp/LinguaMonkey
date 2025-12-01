package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.ProficiencyTestQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProficiencyTestQuestionRepository extends JpaRepository<ProficiencyTestQuestion, UUID> {
    
    List<ProficiencyTestQuestion> findAllByTestConfigIdOrderByOrderIndex(UUID testConfigId);
}