package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.MessageReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface MessageReactionRepository extends JpaRepository<MessageReaction, UUID> {
    @Modifying
    @Query("UPDATE MessageReaction mr SET mr.isDeleted = true, mr.deletedAt = CURRENT_TIMESTAMP " +
            "WHERE mr.chatMessageId = :chatMessageId")
    void softDeleteByChatMessageId(@Param("chatMessageId") UUID chatMessageId);
}