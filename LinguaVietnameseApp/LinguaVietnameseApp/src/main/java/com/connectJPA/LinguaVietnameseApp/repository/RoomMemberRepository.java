package com.connectJPA.LinguaVietnameseApp.repository;

import com.connectJPA.LinguaVietnameseApp.entity.RoomMember;
import com.connectJPA.LinguaVietnameseApp.entity.id.RoomMemberId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RoomMemberRepository extends JpaRepository<RoomMember, RoomMemberId> {
    @Query("SELECT COUNT(rm) FROM RoomMember rm WHERE rm.id.roomId = :roomId AND rm.isDeleted = false")
    long countByIdRoomIdAndIsDeletedFalse(@Param("roomId") UUID roomId);

    @Modifying
    @Query("UPDATE RoomMember rm SET rm.isDeleted = true, rm.endAt = CURRENT_TIMESTAMP, rm.deletedAt = CURRENT_TIMESTAMP " +
            "WHERE rm.id.roomId = :roomId AND rm.id.userId = :userId")
    void softDeleteByIdRoomIdAndIdUserId(@Param("roomId") UUID roomId, @Param("userId") UUID userId);

    @Query("SELECT rm FROM RoomMember rm WHERE rm.id.roomId = :roomId AND rm.id.userId = :userId AND rm.isDeleted = false")
    Optional<RoomMember> findByIdRoomIdAndIdUserIdAndIsDeletedFalse(@Param("roomId") UUID roomId, @Param("userId") UUID userId);

    List<RoomMember> findAllByIdRoomIdAndIsDeletedFalse(UUID roomId);
}

