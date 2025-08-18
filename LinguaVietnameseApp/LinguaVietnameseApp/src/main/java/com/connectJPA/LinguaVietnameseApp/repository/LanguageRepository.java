package com.connectJPA.LinguaVietnameseApp.repository;

import com.connectJPA.LinguaVietnameseApp.entity.Language;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface LanguageRepository extends JpaRepository<Language, UUID> {
    @Query("SELECT l FROM Language l WHERE l.languageCode = :languageCode AND l.languageName = :languageName AND l.isDeleted = false")
    Page<Language> findByLanguageCodeAndLanguageNameAndIsDeletedFalse(@Param("languageCode") String languageCode, @Param("languageName") String languageName, Pageable pageable);

    @Query("SELECT l FROM Language l WHERE l.languageCode = :languageCode AND l.isDeleted = false")
    Optional<Language> findByLanguageCodeAndIsDeletedFalse(@Param("languageCode") String languageCode);

    @Query("UPDATE Language l SET l.isDeleted = true, l.deletedAt = CURRENT_TIMESTAMP WHERE l.languageCode = :id AND l.isDeleted = false")
    void softDeleteByLanguageCode(@Param("id") String languageCode);

    boolean existsByLanguageCodeAndIsDeletedFalse(String languageCode);
}