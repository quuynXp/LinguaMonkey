package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.Friendship;
import com.connectJPA.LinguaVietnameseApp.entity.id.FriendshipId;
import com.connectJPA.LinguaVietnameseApp.enums.FriendshipStatus;

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

public interface FriendshipRepository extends JpaRepository<Friendship, FriendshipId> {
    Page<Friendship> findByIdRequesterIdAndStatusAndIsDeletedFalse(
        UUID requesterId, 
        FriendshipStatus status,
        Pageable pageable
    );

    @Query("SELECT f FROM Friendship f WHERE f.id.requesterId = :requesterId AND f.id.receiverId = :receiverId AND f.isDeleted = false")
    Optional<Friendship> findByIdRequesterIdAndIdReceiverIdAndIsDeletedFalse(@Param("requesterId") UUID requesterId, @Param("receiverId") UUID receiverId);

    @Query("SELECT COUNT(f) FROM Friendship f WHERE (f.id.requesterId = :userId OR f.id.receiverId = :userId) AND f.status = 'accepted' AND f.isDeleted = false")
    long countAcceptedFriends(@Param("userId") UUID userId);

    @Modifying
    @Query("UPDATE Friendship f SET f.status = 'expired' WHERE f.status = 'pending' AND f.createdAt < :sevenDaysAgo")
    int expirePendingFriendships(@Param("sevenDaysAgo") OffsetDateTime sevenDaysAgo);

    @Modifying
    @Query("UPDATE Friendship f SET f.isDeleted = true, f.deletedAt = CURRENT_TIMESTAMP WHERE f.id.requesterId = :requesterId AND f.id.receiverId = :receiverId AND f.isDeleted = false")
    void softDeleteByUserIds(@Param("requesterId") UUID requesterId, @Param("receiverId") UUID receiverId);

    @Query("SELECT f FROM Friendship f WHERE f.id.receiverId = :userId AND f.status = 'PENDING' AND f.isDeleted = false")
    Page<Friendship> findPendingRequests(@Param("userId") UUID userId, Pageable pageable);

    List<Friendship> findByIdRequesterIdAndCreatedAtBetween(UUID userId, OffsetDateTime startOdt, OffsetDateTime endOdt);

    List<Friendship> findByIdReceiverIdAndCreatedAtBetween(UUID userId, OffsetDateTime startOdt, OffsetDateTime endOdt);

    @Query("SELECT COUNT(f) FROM Friendship f " +
           "WHERE (f.id.requesterId  = :userId OR f.id.receiverId  = :userId) " +
           "AND f.status = 'ACCEPTED' " +
           "AND f.createdAt >= :startDate AND f.createdAt <= :endDate")
    int countNewFriends(@Param("userId") UUID userId, 
                        @Param("startDate") OffsetDateTime startDate, 
                        @Param("endDate") OffsetDateTime endDate);
}