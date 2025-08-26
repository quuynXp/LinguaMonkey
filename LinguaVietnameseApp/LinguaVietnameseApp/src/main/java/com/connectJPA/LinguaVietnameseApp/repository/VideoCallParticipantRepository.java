package com.connectJPA.LinguaVietnameseApp.repository;

import com.connectJPA.LinguaVietnameseApp.entity.VideoCallParticipant;
import com.connectJPA.LinguaVietnameseApp.entity.id.VideoCallParticipantId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VideoCallParticipantRepository extends JpaRepository<VideoCallParticipant, VideoCallParticipantId> {
    List<VideoCallParticipant> findByVideoCall_VideoCallId(UUID videoCallId);

    List<VideoCallParticipant> findByUser_UserId(UUID userId);

    List<VideoCallParticipant> findByUser_UserIdAndJoinedAtBetween(UUID userId, OffsetDateTime start, OffsetDateTime end);

}
