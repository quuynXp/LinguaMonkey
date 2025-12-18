package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.UserMedia;
import com.connectJPA.LinguaVietnameseApp.enums.MediaType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface UserMediaRepository extends JpaRepository<UserMedia, UUID> {
    List<UserMedia> findByUserIdAndMediaType(UUID userId, MediaType mediaType);
    List<UserMedia> findByUserId(UUID userId);
    boolean existsByFilePath(String filePath);
}
