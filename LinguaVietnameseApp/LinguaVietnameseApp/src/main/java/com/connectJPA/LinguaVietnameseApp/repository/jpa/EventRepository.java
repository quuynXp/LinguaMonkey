package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.Event;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface EventRepository extends JpaRepository<Event, UUID> {
    @Query("SELECT e FROM Event e WHERE e.eventType = :eventType AND e.isDeleted = false")
    Page<Event> findByEventTypeAndIsDeletedFalse(@Param("eventType") String eventType, Pageable pageable);

    @Query("SELECT e FROM Event e WHERE e.eventId = :id AND e.isDeleted = false")
    Optional<Event> findByEventIdAndIsDeletedFalse(@Param("id") UUID id);


    @Modifying
    @Transactional
    @Query("UPDATE Event e SET e.isDeleted = true, e.deletedAt = CURRENT_TIMESTAMP WHERE e.eventId = :id AND e.isDeleted = false")
    void softDeleteByEventId(@Param("id") UUID id);
}