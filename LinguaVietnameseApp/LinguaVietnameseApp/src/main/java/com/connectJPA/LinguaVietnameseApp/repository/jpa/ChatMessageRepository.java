package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.ChatMessage;
import com.connectJPA.LinguaVietnameseApp.entity.id.ChatMessagesId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, ChatMessagesId> {
    @Query(value = "SELECT * FROM chat_messages WHERE (room_id = :roomId OR :roomId IS NULL) AND (sender_id = :senderId OR :senderId IS NULL) AND is_deleted = false",
            countQuery = "SELECT COUNT(*) FROM chat_messages WHERE (room_id = :roomId OR :roomId IS NULL) AND (sender_id = :senderId OR :senderId IS NULL) AND is_deleted = false",
            nativeQuery = true)
    Page<ChatMessage> findByRoomIdAndSenderIdAndIsDeletedFalse(@Param("roomId") UUID roomId, @Param("senderId") UUID senderId, Pageable pageable);

    @Query(value = "SELECT * FROM chat_messages WHERE chat_message_id = :id AND is_deleted = false", nativeQuery = true)
    Optional<ChatMessage> findByChatMessageIdAndIsDeletedFalse(@Param("id") UUID id);

    long  countBySenderIdAndIsDeletedFalse(UUID senderId);


    Page<ChatMessage> findByRoomIdAndIsDeletedFalse(UUID roomId, Pageable pageable);

    Page<ChatMessage> findByRoomIdAndIsDeletedFalseOrderById_SentAtDesc(UUID roomId, Pageable pageable);


    @Query("SELECT cm FROM ChatMessage cm WHERE cm.id.chatMessageId = :chatMessageId AND cm.isDeleted = false")
    Optional<ChatMessage> findByIdChatMessageIdAndIsDeletedFalse(@Param("chatMessageId") UUID chatMessageId);

    @Modifying
    @Query("UPDATE ChatMessage cm SET cm.isDeleted = true, cm.deletedAt = CURRENT_TIMESTAMP " +
            "WHERE cm.id.chatMessageId = :chatMessageId")
    void softDeleteByChatMessageId(@Param("chatMessageId") UUID chatMessageId);

    @Query("SELECT COUNT(cm) FROM ChatMessage cm WHERE (cm.senderId = :userId OR cm.receiverId = :userId) AND cm.isDeleted = false")
    long countMessagesForUser(@Param("userId") UUID userId);

    @Query("SELECT COUNT(cm) FROM ChatMessage cm WHERE cm.senderId = :userId AND cm.messageType = com.connectJPA.LinguaVietnameseApp.enums.MessageType.TRANSLATION AND cm.isDeleted = false")
    long countTranslationsForUser(@Param("userId") UUID userId);

    /**
     * THÊM: Phương thức tìm kiếm tin nhắn thay thế Elasticsearch.
     * Sử dụng LIKE cho nội dung và lọc tùy chọn theo RoomId.
     */
    @Query("SELECT cm FROM ChatMessage cm WHERE " +
            "LOWER(cm.content) LIKE LOWER(CONCAT('%', :keyword, '%')) AND " +
            "(:roomId IS NULL OR cm.roomId = :roomId) AND " +
            "cm.isDeleted = false " +
            "ORDER BY cm.id.sentAt DESC")
    Page<ChatMessage> searchMessagesByKeyword(
            @Param("keyword") String keyword,
            @Param("roomId") UUID roomId,
            Pageable pageable);
}