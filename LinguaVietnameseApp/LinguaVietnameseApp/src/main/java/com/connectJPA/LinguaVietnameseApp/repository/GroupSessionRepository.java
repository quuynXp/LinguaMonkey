package com.connectJPA.LinguaVietnameseApp.repository;

import com.connectJPA.LinguaVietnameseApp.entity.GroupSession;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface GroupSessionRepository extends JpaRepository<GroupSession, UUID> {
    @Query("SELECT gs FROM GroupSession gs WHERE gs.lessonId = :lessonId AND gs.roomId = :roomId AND gs.isDeleted = false")
    Page<GroupSession> findByLessonIdAndRoomIdAndIsDeletedFalse(@Param("lessonId") UUID lessonId, @Param("roomId") UUID roomId, Pageable pageable);

    @Query("SELECT gs FROM GroupSession gs WHERE gs.groupSessionId = :id AND gs.isDeleted = false")
    Optional<GroupSession> findByGroupSessionIdAndIsDeletedFalse(@Param("id") UUID id);

    @Query("UPDATE GroupSession gs SET gs.isDeleted = true, gs.deletedAt = CURRENT_TIMESTAMP WHERE gs.groupSessionId = :id AND gs.isDeleted = false")
    void softDeleteById(@Param("id") UUID id);
}