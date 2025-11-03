package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.UserMemorization;
import com.connectJPA.LinguaVietnameseApp.enums.ContentType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface UserMemorizationRepository extends JpaRepository<UserMemorization, UUID> {
    Page<UserMemorization> findByUserIdAndIsDeletedFalse(UUID userId, Pageable pageable);
    Page<UserMemorization> findByUserIdAndContentTypeAndIsDeletedFalse(UUID userId, ContentType contentType, Pageable pageable);
}
