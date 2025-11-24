package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.Roadmap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import javax.swing.text.html.Option;
import java.util.List;
import java.util.UUID;

public interface RoadmapRepository extends JpaRepository<Roadmap, UUID> {
    List<Roadmap> findByLanguageCodeAndIsDeletedFalse(String languageCode);

    List<Roadmap> findByIsDeletedFalse();

    @Query("SELECT r FROM Roadmap r WHERE r.isDeleted = false AND r.languageCode = :language")
    List<Roadmap> findActiveByLanguage(@Param("language") String language);

}

