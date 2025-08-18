package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.VideoCallRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.VideoCallResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface VideoCallService {
    Page<VideoCallResponse> getAllVideoCalls(String callerId, String status, Pageable pageable);
    VideoCallResponse getVideoCallById(UUID id);
    VideoCallResponse createVideoCall(VideoCallRequest request);
    VideoCallResponse updateVideoCall(UUID id, VideoCallRequest request);
    void deleteVideoCall(UUID id);
}