package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.UserLanguage;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserLanguageId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserLanguageRepository extends JpaRepository<UserLanguage, UserLanguageId> {

    /**
     * Truy vấn danh sách languageCode (chuỗi) cho một userId cụ thể
     */
    @Query("SELECT ul.id.languageCode FROM UserLanguage ul WHERE ul.id.userId = :userId AND ul.isDeleted = false")
    List<String> findLanguageCodesByUserId(@Param("userId") UUID userId);
}