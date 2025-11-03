package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.Roadmap;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RoadmapRepository extends JpaRepository<Roadmap, UUID> {
    List<Roadmap> findByLanguageCodeAndIsDeletedFalse(String languageCode);

}

