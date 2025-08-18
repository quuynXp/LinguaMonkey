package com.connectJPA.LinguaVietnameseApp.repository;

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

    @Query("SELECT r FROM Room r WHERE r.roomId = :id AND r.isDeleted = false")
    Optional<Room> findByRoomIdAndIsDeletedFalse(@Param("id") UUID id);

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

}