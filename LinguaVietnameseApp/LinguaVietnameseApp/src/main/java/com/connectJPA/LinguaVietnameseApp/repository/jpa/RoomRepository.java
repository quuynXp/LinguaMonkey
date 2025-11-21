package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.Room;
import com.connectJPA.LinguaVietnameseApp.enums.RoomPurpose;
import com.connectJPA.LinguaVietnameseApp.enums.RoomType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface RoomRepository extends JpaRepository<Room, UUID> {
    @Query("SELECT r FROM Room r WHERE r.roomName LIKE %:roomName% AND r.creatorId = :creatorId AND r.isDeleted = false")
    Page<Room> findByRoomNameContainingAndCreatorIdAndIsDeletedFalse(
            @Param("roomName") String roomName, @Param("creatorId") UUID creatorId, Pageable pageable);

    @Query("SELECT r FROM Room r " +
            "JOIN RoomMember m1 ON r.roomId = m1.id.roomId " +
            "JOIN RoomMember m2 ON r.roomId = m2.id.roomId " +
            "WHERE r.roomType = 'PRIVATE' " +
            "AND r.isDeleted = false " +
            "AND m1.id.userId = :userId1 " +
            "AND m2.id.userId = :userId2")
    Optional<Room> findPrivateRoomBetweenUsers(@Param("userId1") UUID userId1, @Param("userId2") UUID userId2);

    @Query("SELECT r FROM Room r WHERE r.roomId = :id AND r.isDeleted = false")
    Optional<Room> findByRoomIdAndIsDeletedFalse(@Param("id") UUID id);

    @Query("SELECT r FROM Room r WHERE r.purpose = :purpose AND r.roomType = :type AND r.isDeleted = false AND " +
            "(SELECT COUNT(m) FROM RoomMember m WHERE m.id.roomId = r.roomId AND m.isDeleted = false) < r.maxMembers")
    Page<Room> findAvailableRoomsByPurposeAndType(
            @Param("purpose") RoomPurpose purpose,
            @Param("type") RoomType type,
            Pageable pageable
    );

    @Modifying
    @Query("UPDATE Room r SET r.isDeleted = true, r.deletedAt = CURRENT_TIMESTAMP WHERE r.roomId = :id AND r.isDeleted = false")
    void softDeleteByRoomId(@Param("id") UUID id);

    @Query("SELECT r FROM Room r WHERE " +
            "(:roomName IS NULL OR r.roomName LIKE %:roomName%) AND " +
            "(:creatorId IS NULL OR r.creatorId = :creatorId) AND " +
            "(:purpose IS NULL OR r.purpose = :purpose) AND " +
            "(:roomType IS NULL OR r.roomType = :roomType) AND " +
            "r.isDeleted = false")
    Page<Room> findByRoomNameContainingAndCreatorIdAndPurposeAndRoomTypeAndIsDeletedFalse(
            @Param("roomName") String roomName,
            @Param("creatorId") UUID creatorId,
            @Param("purpose") RoomPurpose purpose,
            @Param("roomType") RoomType roomType,
            Pageable pageable);

    Optional<Room> findByCreatorIdAndPurposeAndRoomTypeAndIsDeletedFalse(
            UUID creatorId,
            RoomPurpose purpose,
            RoomType roomType
    );

}