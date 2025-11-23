package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.Language;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface LanguageRepository extends JpaRepository<Language, UUID> {

    @Query("""
    SELECT l FROM Language l
    WHERE (:languageCode IS NULL OR l.languageCode = :languageCode)
      AND (:languageName IS NULL OR l.languageName = :languageName)
      AND l.isDeleted = false
""")
    Page<Language> findByLanguageCodeAndLanguageNameAndIsDeletedFalse(
            @Param("languageCode") String languageCode,
            @Param("languageName") String languageName,
            Pageable pageable
    );

    Optional<Language> findByLanguageCodeAndIsDeletedFalse(String languageCode);

    @Modifying
    @Query("UPDATE Language l SET l.isDeleted = true, l.deletedAt = CURRENT_TIMESTAMP WHERE l.languageCode = :id AND l.isDeleted = false")

    void softDeleteByLanguageCode(@Param("id") String id);


    boolean existsByLanguageCodeAndIsDeletedFalse(String languageCode);
}