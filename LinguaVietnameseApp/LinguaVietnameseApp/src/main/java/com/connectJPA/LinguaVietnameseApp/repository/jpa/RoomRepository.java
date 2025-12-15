package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.Room;
import com.connectJPA.LinguaVietnameseApp.enums.RoomPurpose;
import com.connectJPA.LinguaVietnameseApp.enums.RoomType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoomRepository extends JpaRepository<Room, UUID> {

    @Query("SELECT r FROM Room r WHERE " +
            "(:roomName IS NULL OR r.roomName LIKE %:roomName%) AND " +
            "(:creatorId IS NULL OR r.creatorId = :creatorId) AND " +
            "(:purpose IS NULL OR r.purpose = :purpose) AND " +
            "(:roomType IS NULL OR r.roomType = :roomType) AND " +
            "r.purpose != 'AI_CHAT' AND " +
            "r.isDeleted = false AND " +
            "NOT EXISTS (SELECT rm FROM RoomMember rm WHERE rm.room.roomId = r.roomId AND rm.id.userId = :currentUserId AND rm.isDeleted = false)")
    Page<Room> findPublicRoomsExcludingJoined(
            @Param("roomName") String roomName,
            @Param("creatorId") UUID creatorId,
            @Param("purpose") RoomPurpose purpose,
            @Param("roomType") RoomType roomType,
            @Param("currentUserId") UUID currentUserId,
            Pageable pageable);

            @Query("SELECT r FROM Room r " +
            "LEFT JOIN RoomMember rm ON r.roomId = rm.id.roomId AND rm.id.userId = :currentUserId AND rm.isDeleted = false " +
            "WHERE " +
            "(:roomName IS NULL OR LOWER(r.roomName) LIKE LOWER(CONCAT('%', :roomName, '%'))) AND " +
            "(:creatorId IS NULL OR r.creatorId = :creatorId) AND " +
            "(:purpose IS NULL OR r.purpose = :purpose) AND " +
            "(:roomType IS NULL OR r.roomType = :roomType) AND " +
            "r.purpose != 'AI_CHAT' AND " +
            "r.isDeleted = false " +
            "ORDER BY " +
            "   CASE WHEN rm.id.userId IS NOT NULL THEN 1 ELSE 0 END DESC, " + // Đã tham gia lên đầu
            "   (SELECT COALESCE(MAX(cm.id.sentAt), r.updatedAt) FROM ChatMessage cm WHERE cm.roomId = r.roomId) DESC") // Sort theo tin nhắn mới nhất
    Page<Room> findAllPublicRoomsWithPriority(
            @Param("roomName") String roomName,
            @Param("creatorId") UUID creatorId,
            @Param("purpose") RoomPurpose purpose,
            @Param("roomType") RoomType roomType,
            @Param("currentUserId") UUID currentUserId,
            Pageable pageable);

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
            @Param("roomType") com.connectJPA.LinguaVietnameseApp.enums.RoomType roomType,
            Pageable pageable);

    Optional<Room> findByRoomIdAndIsDeletedFalse(UUID roomId);

    Optional<Room> findByRoomCodeAndIsDeletedFalse(String roomCode);

    @Query("SELECT COUNT(rm) FROM RoomMember rm WHERE rm.room.roomId = :roomId AND rm.isDeleted = false")
    long countMembersByRoomId(@Param("roomId") UUID roomId);

    // FIXED: Query này quan trọng.
    // 1. Tìm Room PRIVATE_CHAT chưa bị xóa.
    // 2. Chứa member user1 và user2.
    // 3. LƯU Ý: Không check rm.isDeleted = false trong subquery. Lý do: Nếu user đã rời phòng (soft delete), ta vẫn muốn tìm thấy phòng này để khôi phục lại họ.
    @Query("SELECT r FROM Room r " +
            "WHERE r.purpose = 'PRIVATE_CHAT' " +
            "AND r.isDeleted = false " +
            "AND EXISTS (SELECT rm1 FROM RoomMember rm1 WHERE rm1.room = r AND rm1.id.userId = :userId1) " +
            "AND EXISTS (SELECT rm2 FROM RoomMember rm2 WHERE rm2.room = r AND rm2.id.userId = :userId2)")
    Optional<Room> findPrivateRoomBetweenUsers(@Param("userId1") UUID userId1, @Param("userId2") UUID userId2);

    @Query("SELECT r FROM Room r WHERE r.purpose = :purpose AND r.roomType = :roomType AND r.isDeleted = false " +
            "AND (SELECT COUNT(rm) FROM RoomMember rm WHERE rm.room.roomId = r.roomId AND rm.isDeleted = false) < r.maxMembers")
    Page<Room> findAvailableRoomsByPurposeAndType(@Param("purpose") RoomPurpose purpose,
                                                                                  @Param("roomType") com.connectJPA.LinguaVietnameseApp.enums.RoomType roomType,
                                                                                  Pageable pageable);

    @Query("SELECT r FROM Room r " +
            "JOIN RoomMember rm ON r.roomId = rm.id.roomId " +
            "WHERE rm.id.userId = :userId AND rm.isDeleted = false AND r.isDeleted = false " +
            "AND (:purpose IS NULL OR r.purpose = :purpose) " +
            "ORDER BY r.updatedAt DESC")
    Page<Room> findRoomsByMemberUserId(@Param("userId") UUID userId,
                                                             @Param("purpose") RoomPurpose purpose,
                                                             Pageable pageable);

                                                             @Query("SELECT r FROM Room r WHERE r.courseId = :courseId AND r.isDeleted = false")
    Optional<Room> findByCourseId(UUID courseId);
    
    boolean existsByRoomCode(String roomCode);

    @Query("UPDATE Room r SET r.isDeleted = true, r.deletedAt = CURRENT_TIMESTAMP WHERE r.roomId = :roomId")
    void softDeleteByRoomId(@Param("roomId") UUID roomId);

    List<Room> findByCreatorIdAndPurposeAndIsDeletedFalse(UUID userId, RoomPurpose aiChat);

    @Query("SELECT r FROM Room r " +
            "JOIN RoomMember rm ON r.roomId = rm.id.roomId " +
            "WHERE rm.id.userId = :userId AND rm.isDeleted = false AND r.isDeleted = false " +
            "AND r.purpose != 'AI_CHAT' " +
            "AND (:purpose IS NULL OR r.purpose = :purpose) " +
            "AND (SELECT COUNT(mem) FROM RoomMember mem WHERE mem.room.roomId = r.roomId AND mem.isDeleted = false) >= 2 " +
            "AND (SELECT COUNT(msg) FROM ChatMessage msg WHERE msg.roomId = r.roomId AND msg.isDeleted = false) > 0 " +
            "ORDER BY r.updatedAt DESC")
    Page<Room> findJoinedRoomsStrict(
            @Param("userId") UUID userId,
            @Param("purpose") RoomPurpose purpose,
            Pageable pageable);

    @Query("SELECT r FROM Room r WHERE " +
            "(:roomName IS NULL OR r.roomName LIKE %:roomName%) AND " +
            "(:creatorId IS NULL OR r.creatorId = :creatorId) AND " +
            "(:purpose IS NULL OR r.purpose = :purpose) AND " +
            "(:roomType IS NULL OR r.roomType = :roomType) AND " +
            "r.purpose != 'AI_CHAT' AND " +
            "r.isDeleted = false")
    Page<Room> findPublicRooms(
            @Param("roomName") String roomName,
            @Param("creatorId") UUID creatorId,
            @Param("purpose") RoomPurpose purpose,
            @Param("roomType") RoomType roomType,
            Pageable pageable);

    @Query("SELECT r FROM Room r " +
            "JOIN RoomMember rm ON r.roomId = rm.id.roomId " +
            "WHERE rm.id.userId = :userId AND rm.isDeleted = false AND r.isDeleted = false " +
            "AND r.purpose != 'AI_CHAT' " +
            "AND (:purpose IS NULL OR r.purpose = :purpose) " +
            "ORDER BY r.updatedAt DESC")
    Page<Room> findJoinedRoomsExcludingAi(
            @Param("userId") UUID userId,
            @Param("purpose") RoomPurpose purpose,
            Pageable pageable);

    Optional<Room> findByCreatorIdAndPurposeAndRoomTypeAndIsDeletedFalse(UUID userId, RoomPurpose purpose, RoomType roomType);

    Optional<Room> findByCourseIdAndIsDeletedFalse(UUID courseId);

    Room findRoomByRoomId(UUID roomId);
}