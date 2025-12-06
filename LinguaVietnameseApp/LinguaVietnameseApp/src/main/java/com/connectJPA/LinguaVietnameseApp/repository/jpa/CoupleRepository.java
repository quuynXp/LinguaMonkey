package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.Couple;
import com.connectJPA.LinguaVietnameseApp.enums.CoupleStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CoupleRepository extends JpaRepository<Couple, UUID> {
    void deleteByUser1_UserIdAndUser2_UserId(UUID user1Id, UUID user2Id);
    
    Optional<Couple> findByUser1_UserIdAndUser2_UserIdAndIsDeletedFalse(UUID user1Id, UUID user2Id);

    @Query("SELECT c FROM Couple c WHERE (c.user1.userId = :userId OR c.user2.userId = :userId) AND c.isDeleted = false")
    Optional<Couple> findByUserId(@Param("userId") UUID userId);

    @Query("SELECT c FROM Couple c WHERE c.status IN ('COUPLE', 'IN_LOVE') AND c.isDeleted = false")
    List<Couple> findAllActiveCouples();

    // SỬA: Tìm kiếm theo User1 HOẶC User2 để lấy danh sách requests đầy đủ
    @Query("SELECT c FROM Couple c WHERE (c.user1.userId = :userId OR c.user2.userId = :userId) AND c.status = :status AND c.isDeleted = false")
    Page<Couple> findAllByUserIdAndStatus(@Param("userId") UUID userId, @Param("status") CoupleStatus status, Pageable pageable);

    @Query("select c from Couple c where c.status = :status and c.exploringExpiresAt < :now")
    List<Couple> findExploringExpired(@Param("status") CoupleStatus status, @Param("now") OffsetDateTime now);

    @Modifying
    @Query("UPDATE Couple c SET c.status = 'EXPIRED' WHERE c.status = 'EXPLORING' AND c.exploringExpiresAt < :now")
    int expireExploringCouples(@Param("now") OffsetDateTime now);

    // Giữ lại method cũ nếu có nơi khác dùng, nhưng logic chính sẽ chuyển sang method trên
    Page<Couple> findAllByUser1_UserIdAndStatusAndIsDeletedFalse(UUID userId, CoupleStatus status, Pageable pageable);
}