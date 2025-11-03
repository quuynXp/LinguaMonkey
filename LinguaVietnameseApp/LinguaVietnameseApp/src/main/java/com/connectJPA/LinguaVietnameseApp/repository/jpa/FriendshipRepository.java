package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.Friendship;
import com.connectJPA.LinguaVietnameseApp.entity.id.FriendshipId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface FriendshipRepository extends JpaRepository<Friendship, FriendshipId> {
    @Query("SELECT f FROM Friendship f WHERE f.id.user1Id = :user1Id AND f.status = :status AND f.isDeleted = false")
    Page<Friendship> findByIdUser1IdAndStatusAndIsDeletedFalse(@Param("user1Id") UUID user1Id, @Param("status") String status, Pageable pageable);

    @Query("SELECT f FROM Friendship f WHERE f.id.user1Id = :user1Id AND f.id.user2Id = :user2Id AND f.isDeleted = false")
    Optional<Friendship> findByIdUser1IdAndIdUser2IdAndIsDeletedFalse(@Param("user1Id") UUID user1Id, @Param("user2Id") UUID user2Id);

    @Query("SELECT COUNT(f) FROM Friendship f WHERE (f.id.user1Id = :userId OR f.id.user2Id = :userId) AND f.status = 'accepted' AND f.isDeleted = false")
    long countAcceptedFriends(UUID userId);

    @Modifying
    @Query("UPDATE Friendship f SET f.isDeleted = true, f.deletedAt = CURRENT_TIMESTAMP WHERE f.id.user1Id = :user1Id AND f.id.user2Id = :user2Id AND f.isDeleted = false")
    void softDeleteByUserIds(@Param("user1Id") UUID user1Id, @Param("user2Id") UUID user2Id);

    @Query("SELECT f FROM Friendship f WHERE f.id.user2Id = :userId AND f.status = 'PENDING' AND f.isDeleted = false")
    Page<Friendship> findPendingRequests(@Param("userId") UUID userId, Pageable pageable);

}