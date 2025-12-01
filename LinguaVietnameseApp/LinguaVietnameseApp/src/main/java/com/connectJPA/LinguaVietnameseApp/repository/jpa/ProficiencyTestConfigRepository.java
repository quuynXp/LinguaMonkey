package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.ProficiencyTestConfig;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ProficiencyTestConfigRepository extends JpaRepository<ProficiencyTestConfig, UUID> {

    // Lấy các bài test (còn active) theo ngôn ngữ
    List<ProficiencyTestConfig> findAllByLanguageCodeAndIsActiveTrue(String languageCode);

    Page<ProficiencyTestConfig> findAllByLanguageCodeAndIsActiveTrue(String languageCode, Pageable pageable);

    // List<ProficiencyTestConfig> findAllByTestConfigIdOrderByOrderIndex(UUID testConfigId);
}