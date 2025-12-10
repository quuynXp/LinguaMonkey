package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.CreateGroupCallRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.VideoCallRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.VideoCallResponse;
import com.connectJPA.LinguaVietnameseApp.entity.VideoCallParticipant;
import com.connectJPA.LinguaVietnameseApp.enums.VideoCallParticipantStatus;
import com.connectJPA.LinguaVietnameseApp.enums.VideoCallType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

public interface VideoCallService {
    Page<VideoCallResponse> getAllVideoCalls(String callerId, String status, Pageable pageable);
    VideoCallResponse getVideoCallById(UUID id);
    VideoCallResponse createVideoCall(VideoCallRequest request);

    // Participants management
    @Transactional
    void addParticipant(UUID videoCallId, UUID userId);

    @Transactional
    void removeParticipant(UUID videoCallId, UUID userId);

    List<VideoCallParticipant> getParticipants(UUID videoCallId);

    List<VideoCallResponse> getVideoCallHistoryByUser(UUID userId);

    @Transactional
    void updateParticipantStatus(UUID videoCallId, UUID userId, VideoCallParticipantStatus status);

    VideoCallResponse updateVideoCall(UUID id, VideoCallRequest request);
    void deleteVideoCall(UUID id);
    VideoCallResponse createGroupVideoCall(CreateGroupCallRequest request);
}