package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.VideoCallRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.VideoCallResponse;
import com.connectJPA.LinguaVietnameseApp.entity.VideoCall;
import com.connectJPA.LinguaVietnameseApp.entity.VideoCallParticipant;
import com.connectJPA.LinguaVietnameseApp.entity.id.VideoCallParticipantId;
import com.connectJPA.LinguaVietnameseApp.enums.VideoCallParticipantStatus;
import com.connectJPA.LinguaVietnameseApp.enums.VideoCallRole;
import com.connectJPA.LinguaVietnameseApp.enums.VideoCallStatus;
import com.connectJPA.LinguaVietnameseApp.enums.VideoCallType;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
import com.connectJPA.LinguaVietnameseApp.mapper.VideoCallMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.VideoCallParticipantRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.VideoCallRepository;
import com.connectJPA.LinguaVietnameseApp.service.VideoCallService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class VideoCallServiceImpl implements VideoCallService {
    private final VideoCallRepository videoCallRepository;
    private final VideoCallMapper videoCallMapper;
    private final VideoCallParticipantRepository videoCallParticipantRepository;
    private final UserRepository userRepository;

    @Override
    public Page<VideoCallResponse> getAllVideoCalls(String callerId, String status, Pageable pageable) {
        try {
            if (pageable == null) {
                throw new AppException(ErrorCode.INVALID_PAGEABLE);
            }
            UUID callerUuid = (callerId != null) ? UUID.fromString(callerId) : null;
            Page<VideoCall> videoCalls = videoCallRepository.findByCallerIdAndStatusAndIsDeletedFalse(callerUuid, status, pageable);
            return videoCalls.map(videoCallMapper::toResponse);
        } catch (Exception e) {
            log.error("Error while fetching all video calls: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public VideoCallResponse getVideoCallById(UUID id) {
        try {
            if (id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            VideoCall videoCall = videoCallRepository.findByVideoCallIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.VIDEO_CALL_NOT_FOUND));
            return videoCallMapper.toResponse(videoCall);
        } catch (Exception e) {
            log.error("Error while fetching video call by ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public VideoCallResponse createVideoCall(VideoCallRequest request) {
        VideoCall videoCall = videoCallMapper.toEntity(request);
        videoCall = videoCallRepository.save(videoCall);
        return videoCallMapper.toResponse(videoCall);
    }

    @Override
    public VideoCallResponse createGroupVideoCall(UUID callerId, List<UUID> participantIds, VideoCallType type) {
        VideoCall videoCall = VideoCall.builder()
                .callerId(callerId)
                .videoCallType(type)
                .status(VideoCallStatus.INITIATED)
                .build();
        videoCall = videoCallRepository.save(videoCall);

        List<VideoCallParticipant> participants = new ArrayList<>();
        for (UUID userId : participantIds) {
            VideoCallParticipant participant = VideoCallParticipant.builder()
                    .id(new VideoCallParticipantId(videoCall.getVideoCallId(), userId))
                    .videoCall(videoCall)
                    .user(userRepository.getReferenceById(userId))
                    .joinedAt(OffsetDateTime.now())
                    .role(userId.equals(callerId) ? VideoCallRole.HOST : VideoCallRole.GUEST)
                    .status(VideoCallParticipantStatus.CONNECTED)
                    .build();
            participants.add(participant);
        }
        videoCallParticipantRepository.saveAll(participants);
        return videoCallMapper.toResponse(videoCall);
    }

    // Participants management
    @Transactional
    @Override
    public void addParticipant(UUID videoCallId, UUID userId) {
        VideoCall videoCall = videoCallRepository.findByVideoCallIdAndIsDeletedFalse(videoCallId)
                .orElseThrow(() -> new AppException(ErrorCode.VIDEO_CALL_NOT_FOUND));
        VideoCallParticipant participant = VideoCallParticipant.builder()
                .id(new VideoCallParticipantId(videoCallId, userId))
                .videoCall(videoCall)
                .user(userRepository.getReferenceById(userId))
                .joinedAt(OffsetDateTime.now())
                .role(VideoCallRole.GUEST)
                .status(VideoCallParticipantStatus.CONNECTED)
                .build();
        videoCallParticipantRepository.save(participant);
    }

    @Transactional
    @Override
    public void removeParticipant(UUID videoCallId, UUID userId) {
        VideoCallParticipant participant = videoCallParticipantRepository.findById(
                        new VideoCallParticipantId(videoCallId, userId))
                .orElseThrow(() -> new AppException(ErrorCode.PARTICIPANT_NOT_FOUND));
        videoCallParticipantRepository.delete(participant);
    }

    @Override
    public List<VideoCallParticipant> getParticipants(UUID videoCallId) {
        return videoCallParticipantRepository.findByVideoCall_VideoCallId(videoCallId);
    }


    @Override
    public List<VideoCallResponse> getVideoCallHistoryByUser(UUID userId) {
        try {
            // 1. Lấy tất cả VideoCallParticipant của user
            List<VideoCallParticipant> participantList = videoCallParticipantRepository.findByUser_UserId(userId);

            // 2. Map sang VideoCallResponse
            List<VideoCallResponse> responses = new ArrayList<>();
            for (VideoCallParticipant participant : participantList) {
                VideoCall videoCall = participant.getVideoCall();
                if (!videoCall.isDeleted()) {
                    responses.add(videoCallMapper.toResponse(videoCall));
                }
            }

            // 3. Thêm cả video call mà user là caller nhưng chưa tham gia participant
            List<VideoCall> callerVideoCalls = videoCallRepository.findByCallerIdAndIsDeletedFalse(userId);
            for (VideoCall vc : callerVideoCalls) {
                if (responses.stream().noneMatch(r -> r.getVideoCallId().equals(vc.getVideoCallId()))) {
                    responses.add(videoCallMapper.toResponse(vc));
                }
            }

            return responses;
        } catch (Exception e) {
            log.error("Error fetching video call history for user {}: {}", userId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }


    @Transactional
    @Override
    public void updateParticipantStatus(UUID videoCallId, UUID userId, VideoCallParticipantStatus status) {
        VideoCallParticipant participant = videoCallParticipantRepository.findById(
                        new VideoCallParticipantId(videoCallId, userId))
                .orElseThrow(() -> new AppException(ErrorCode.PARTICIPANT_NOT_FOUND));
        participant.setStatus(status);
        videoCallParticipantRepository.save(participant);
    }


    @Override
    @Transactional
    public VideoCallResponse updateVideoCall(UUID id, VideoCallRequest request) {
        try {
            if (id == null || request == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            VideoCall videoCall = videoCallRepository.findByVideoCallIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.VIDEO_CALL_NOT_FOUND));
            videoCallMapper.updateEntityFromRequest(request, videoCall);
            videoCall = videoCallRepository.save(videoCall);
            return videoCallMapper.toResponse(videoCall);
        } catch (Exception e) {
            log.error("Error while updating video call ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public void deleteVideoCall(UUID id) {
        try {
            if (id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            VideoCall videoCall = videoCallRepository.findByVideoCallIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.VIDEO_CALL_NOT_FOUND));
            videoCallRepository.softDeleteById(id);
        } catch (Exception e) {
            log.error("Error while deleting video call ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }
}