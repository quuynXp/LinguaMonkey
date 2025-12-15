package com.connectJPA.LinguaVietnameseApp.repository.jpa;

import com.connectJPA.LinguaVietnameseApp.entity.VideoCall;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VideoCallRepository extends JpaRepository<VideoCall, UUID> {
    @Query("SELECT vc FROM VideoCall vc WHERE vc.callerId = :callerId AND vc.status = :status AND vc.isDeleted = false")
    Page<VideoCall> findByCallerIdAndStatusAndIsDeletedFalse(
            @Param("callerId") UUID callerId, @Param("status") String status, Pageable pageable);

    @Query("SELECT vc FROM VideoCall vc WHERE vc.videoCallId = :id AND vc.isDeleted = false")
    Optional<VideoCall> findByVideoCallIdAndIsDeletedFalse(@Param("id") UUID id);

    @Modifying
    @Query("UPDATE VideoCall vc SET vc.isDeleted = true, vc.deletedAt = CURRENT_TIMESTAMP WHERE vc.videoCallId = :id AND vc.isDeleted = false")
    void softDeleteById(@Param("id") UUID id);

    List<VideoCall> findByCallerIdAndIsDeletedFalse(UUID callerId);

    @Query("SELECT COUNT(vc) FROM VideoCall vc WHERE (vc.callerId = :userId OR vc.calleeId = :userId) " +
           "AND (vc.status = 'ENDED' OR vc.status = 'COMPLETED') AND vc.isDeleted = false")
    long countCompletedCallsForUser(@Param("userId") UUID userId);

    // For Daily Challenge (Today)
    @Query("SELECT COUNT(vc) FROM VideoCall vc WHERE (vc.callerId = :userId OR vc.calleeId = :userId) " +
           "AND (vc.status = 'ENDED' OR vc.status = 'COMPLETED') " +
           "AND vc.startTime BETWEEN :start AND :end AND vc.isDeleted = false")
    long countCompletedCallsForUserBetween(@Param("userId") UUID userId, 
                                           @Param("start") OffsetDateTime start, 
                                           @Param("end") OffsetDateTime end);

}