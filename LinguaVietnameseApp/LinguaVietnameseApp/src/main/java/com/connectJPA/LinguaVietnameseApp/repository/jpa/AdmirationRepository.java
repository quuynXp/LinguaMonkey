package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.Admiration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AdmirationRepository extends JpaRepository<Admiration, UUID> {
    long countByUserId(UUID userId);
    boolean existsByUserIdAndSenderId(UUID userId, UUID senderId);
}
