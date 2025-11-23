package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.UserMemorization;
import com.connectJPA.LinguaVietnameseApp.enums.ContentType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface UserMemorizationRepository extends JpaRepository<UserMemorization, UUID> {
    Page<UserMemorization> findByUserIdAndIsDeletedFalse(UUID userId, Pageable pageable);
    Page<UserMemorization> findByUserIdAndContentTypeAndIsDeletedFalse(UUID userId, ContentType contentType, Pageable pageable);

    /**
     * THÊM: Phương thức tìm kiếm Memorization thay thế Elasticsearch.
     * Tìm kiếm theo keyword trong noteText.
     */
    @Query("SELECT um FROM UserMemorization um WHERE " +
            "um.userId = :userId AND " +
            "LOWER(um.noteText) LIKE LOWER(CONCAT('%', :keyword, '%')) AND " +
            "um.isDeleted = false " +
            "ORDER BY um.createdAt DESC")
    Page<UserMemorization> searchMemorizationsByKeyword(
            @Param("userId") UUID userId, 
            @Param("keyword") String keyword, 
            Pageable pageable);
}