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
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoomRepository extends JpaRepository<Room, UUID> {

    @Query("SELECT r FROM Room r WHERE " +
            "(COALESCE(:roomName, '') = '' OR (LOWER(r.roomName) LIKE LOWER(CONCAT('%', :roomName, '%')) OR r.roomCode LIKE :roomName)) AND " +
            "(:creatorId IS NULL OR r.creatorId = :creatorId) AND " +
            "(:purpose IS NULL OR r.purpose = :purpose) AND " +
            "(:roomType IS NULL OR r.roomType = :roomType OR (r.roomType = com.connectJPA.LinguaVietnameseApp.enums.RoomType.PRIVATE AND r.purpose != com.connectJPA.LinguaVietnameseApp.enums.RoomPurpose.PRIVATE_CHAT)) AND " +
            "r.purpose != com.connectJPA.LinguaVietnameseApp.enums.RoomPurpose.AI_CHAT AND " +
            "r.purpose != com.connectJPA.LinguaVietnameseApp.enums.RoomPurpose.PRIVATE_CHAT AND " +
            "r.isDeleted = false")
    Page<Room> findRoomsSimple(
            @Param("roomName") String roomName,
            @Param("creatorId") UUID creatorId,
            @Param("purpose") RoomPurpose purpose,
            @Param("roomType") RoomType roomType,
            @Param("pageable") Pageable pageable);

    @Query("SELECT COUNT(rm) FROM RoomMember rm WHERE rm.room.roomId = :roomId AND rm.isDeleted = false")
    long countMembersByRoomId(@Param("roomId") UUID roomId);

    @Query("SELECT r FROM Room r " +
            "JOIN RoomMember rm ON r.roomId = rm.id.roomId " +
            "WHERE rm.id.userId = :userId AND rm.isDeleted = false AND r.isDeleted = false " +
            "AND r.purpose != com.connectJPA.LinguaVietnameseApp.enums.RoomPurpose.AI_CHAT " +
            "AND (:purpose IS NULL OR r.purpose = :purpose) " +
            "AND (" +
            "   r.purpose != com.connectJPA.LinguaVietnameseApp.enums.RoomPurpose.PRIVATE_CHAT " +
            "   OR " +
            "   (r.purpose = com.connectJPA.LinguaVietnameseApp.enums.RoomPurpose.PRIVATE_CHAT " +
            "    AND (SELECT COUNT(msg) FROM ChatMessage msg WHERE msg.roomId = r.roomId AND msg.isDeleted = false) > 0) " +
            ") " +
            "ORDER BY r.updatedAt DESC")
    Page<Room> findJoinedRoomsStrict(
            @Param("userId") UUID userId,
            @Param("purpose") RoomPurpose purpose,
            Pageable pageable);

    @Query("SELECT r FROM Room r " +
            "WHERE r.purpose = com.connectJPA.LinguaVietnameseApp.enums.RoomPurpose.PRIVATE_CHAT " +
            "AND r.isDeleted = false " +
            "AND EXISTS (SELECT rm1 FROM RoomMember rm1 WHERE rm1.room = r AND rm1.id.userId = :userId1) " +
            "AND EXISTS (SELECT rm2 FROM RoomMember rm2 WHERE rm2.room = r AND rm2.id.userId = :userId2)")
    List<Room> findPrivateRoomsBetweenUsers(@Param("userId1") UUID userId1, @Param("userId2") UUID userId2);

    @Query("SELECT r FROM Room r WHERE r.purpose = :purpose AND r.roomType = :roomType AND r.isDeleted = false " +
            "AND (SELECT COUNT(rm) FROM RoomMember rm WHERE rm.room.roomId = r.roomId AND rm.isDeleted = false) < r.maxMembers")
    Page<Room> findAvailableRoomsByPurposeAndType(@Param("purpose") RoomPurpose purpose,
                                                  @Param("roomType") RoomType roomType,
                                                  Pageable pageable);

    @Query("SELECT r FROM Room r WHERE r.courseId = :courseId AND r.isDeleted = false")
    Optional<Room> findByCourseId(@Param("courseId") UUID courseId);

    boolean existsByRoomCode(String roomCode);

    @Modifying
    @Query("UPDATE Room r SET r.isDeleted = true, r.deletedAt = CURRENT_TIMESTAMP WHERE r.roomId = :roomId")
    void softDeleteByRoomId(@Param("roomId") UUID roomId);

    List<Room> findByCreatorIdAndPurposeAndIsDeletedFalse(UUID userId, RoomPurpose purpose);

    Optional<Room> findByCreatorIdAndPurposeAndRoomTypeAndIsDeletedFalse(UUID userId, RoomPurpose purpose, RoomType roomType);

    Optional<Room> findByCourseIdAndIsDeletedFalse(UUID courseId);

    Optional<Room> findByRoomIdAndIsDeletedFalse(UUID roomId);

    Optional<Room> findByRoomCodeAndIsDeletedFalse(String roomCode);
}