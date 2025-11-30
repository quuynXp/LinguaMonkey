package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.Couple;
import com.connectJPA.LinguaVietnameseApp.enums.CoupleStatus;
import io.lettuce.core.dynamic.annotation.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CoupleRepository extends JpaRepository<Couple, UUID> {
    void deleteByUser1_UserIdAndUser2_UserId(UUID user1Id, UUID user2Id);
    Optional<Couple> findByUser1_UserIdAndUser2_UserIdAndIsDeletedFalse(UUID user1Id, UUID user2Id);

    @Query("SELECT c FROM Couple c WHERE (c.user1.userId = :userId OR c.user2.userId = :userId) AND c.isDeleted = false")
    Optional<Couple> findByUserId(@Param("userId") UUID userId);

    Page<Couple> findAllByUser1_UserIdAndStatusAndIsDeletedFalse(UUID userId, String status, Pageable pageable);

    @Query("select c from Couple c where c.status = :status and c.exploringExpiresAt < :now")
    List<Couple> findExploringExpired(@Param("status") CoupleStatus status, @Param("now") OffsetDateTime now);

    @Modifying
    @Query("UPDATE Couple c SET c.status = 'expired' WHERE c.status = 'exploring' AND c.exploringExpiresAt < :now")
    int expireExploringCouples(@Param("now") OffsetDateTime now);

    Page<Couple> findAllByUser1_UserIdOrUser2_UserIdAndStatusAndIsDeletedFalse(UUID userId1, UUID userId2, String status, Pageable pageable);
    Page<Couple> findAllByUser1_UserIdAndStatusAndIsDeletedFalse(UUID user1Id, CoupleStatus statusEnum,
            Pageable pageable);
}

