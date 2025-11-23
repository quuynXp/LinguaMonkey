package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.GroupSession;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface GroupSessionRepository extends JpaRepository<GroupSession, UUID> {
    Page<GroupSession> findByLessonIdAndRoomIdAndIsDeletedFalse(UUID lessonId, UUID roomId, Pageable pageable);

    Optional<GroupSession> findByGroupSessionIdAndIsDeletedFalse(UUID id);

    @Modifying
    @Query("UPDATE GroupSession gs SET gs.isDeleted = true, gs.deletedAt = CURRENT_TIMESTAMP WHERE gs.groupSessionId = :id AND gs.isDeleted = false")
    void softDeleteById(@Param("id") UUID id);

}