package com.connectJPA.LinguaVietnameseApp.repository;

import com.connectJPA.LinguaVietnameseApp.entity.GrammarProgress;
import com.connectJPA.LinguaVietnameseApp.entity.id.GrammarProgressId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GrammarProgressRepository extends JpaRepository<GrammarProgress, GrammarProgressId> {
}
