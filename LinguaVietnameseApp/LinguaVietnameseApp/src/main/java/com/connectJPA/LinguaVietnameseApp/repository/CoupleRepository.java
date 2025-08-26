package com.connectJPA.LinguaVietnameseApp.repository;

import com.connectJPA.LinguaVietnameseApp.entity.Couple;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CoupleRepository extends JpaRepository<Couple, UUID> {
    void deleteByUser1_UserIdAndUser2_UserId(UUID user1Id, UUID user2Id);
    Optional<Couple> findByUser1_UserIdAndUser2_UserIdAndIsDeletedFalse(UUID user1Id, UUID user2Id);

    Page<Couple> findAllByUser1_UserIdAndStatusAndIsDeletedFalse(UUID userId, String status, Pageable pageable);

    Page<Couple> findAllByUser1_UserIdOrUser2_UserIdAndStatusAndIsDeletedFalse(UUID userId1, UUID userId2, String status, Pageable pageable);
}

