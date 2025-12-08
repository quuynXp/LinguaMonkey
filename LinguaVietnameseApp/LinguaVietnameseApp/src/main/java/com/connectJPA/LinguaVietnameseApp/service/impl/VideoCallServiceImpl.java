package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.VideoCallRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.VideoCallResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Room;
import com.connectJPA.LinguaVietnameseApp.entity.VideoCall;
import com.connectJPA.LinguaVietnameseApp.entity.VideoCallParticipant;
import com.connectJPA.LinguaVietnameseApp.entity.id.VideoCallParticipantId;
import com.connectJPA.LinguaVietnameseApp.enums.*;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
import com.connectJPA.LinguaVietnameseApp.mapper.VideoCallMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.RoomRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.VideoCallParticipantRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.VideoCallRepository;
import com.connectJPA.LinguaVietnameseApp.service.BadgeService;
import com.connectJPA.LinguaVietnameseApp.service.DailyChallengeService;
import com.connectJPA.LinguaVietnameseApp.service.VideoCallService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class VideoCallServiceImpl implements VideoCallService {
    private final VideoCallRepository videoCallRepository;
    private final VideoCallMapper videoCallMapper;
    private final VideoCallParticipantRepository videoCallParticipantRepository;
    private final UserRepository userRepository;
    private final RoomRepository roomRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Lazy
    private final DailyChallengeService dailyChallengeService;
    @Lazy
    private final BadgeService badgeService;

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
        Room room = Room.builder()
                .creatorId(request.getCallerId())
                .topic(RoomTopic.WORLD)
                .purpose(RoomPurpose.CALL)
                .status(RoomStatus.ACTIVE)
                .build();

        var roomSaved = roomRepository.save(room);

        VideoCall videoCall = videoCallMapper.toEntity(request);
        videoCall.setRoomId(roomSaved.getRoomId());
        videoCall = videoCallRepository.save(videoCall);
        return videoCallMapper.toResponse(videoCall);
    }

    @Override
    @Transactional
    public VideoCallResponse createGroupVideoCall(UUID callerId, List<UUID> participantIds, VideoCallType type) {
        Room room = Room.builder()
                .creatorId(callerId)
                .topic(RoomTopic.WORLD)
                .purpose(RoomPurpose.CALL)
                .status(RoomStatus.ACTIVE)
                .build();

        var roomSaved = roomRepository.save(room);

        VideoCall videoCall = VideoCall.builder()
                .callerId(callerId)
                .roomId(roomSaved.getRoomId())
                .videoCallType(type)
                .status(VideoCallStatus.INITIATED)
                .startTime(OffsetDateTime.now())
                .build();
        videoCall = videoCallRepository.save(videoCall);

        List<VideoCallParticipant> participants = new ArrayList<>();
        
        VideoCallParticipant host = VideoCallParticipant.builder()
                .id(new VideoCallParticipantId(videoCall.getVideoCallId(), callerId))
                .videoCall(videoCall)
                .user(userRepository.getReferenceById(callerId))
                .joinedAt(OffsetDateTime.now())
                .role(VideoCallRole.HOST)
                .status(VideoCallParticipantStatus.CONNECTED)
                .build();
        participants.add(host);

        for (UUID userId : participantIds) {
            if (!userId.equals(callerId)) {
                VideoCallParticipant participant = VideoCallParticipant.builder()
                        .id(new VideoCallParticipantId(videoCall.getVideoCallId(), userId))
                        .videoCall(videoCall)
                        .user(userRepository.getReferenceById(userId))
                        .joinedAt(OffsetDateTime.now())
                        .role(VideoCallRole.GUEST)
                        .status(VideoCallParticipantStatus.WAITING)
                        .build();
                participants.add(participant);
            }
        }
        videoCallParticipantRepository.saveAll(participants);

        VideoCallResponse response = videoCallMapper.toResponse(videoCall);
        
        Map<String, Object> socketPayload = new HashMap<>();
        socketPayload.put("type", "INCOMING_CALL");
        socketPayload.put("roomId", roomSaved.getRoomId().toString());
        socketPayload.put("videoCallId", videoCall.getVideoCallId());
        socketPayload.put("callerId", callerId);
        socketPayload.put("roomName", "Group Call");

        messagingTemplate.convertAndSend("/topic/room/" + roomSaved.getRoomId(), socketPayload);

        for (UUID userId : participantIds) {
            if (!userId.equals(callerId)) {
                try {
                    messagingTemplate.convertAndSendToUser(
                        userId.toString(),
                        "/queue/notifications",
                        socketPayload
                    );
                } catch (Exception e) {
                    log.warn("Failed to notify user {}", userId);
                }
            }
        }

        return response;
    }

    private java.util.Map<String, Object> wrapWithMessageType(VideoCallResponse response, String type) {
        java.util.Map<String, Object> map = new java.util.HashMap<>();
        map.put("type", type);
        map.put("roomId", response.getRoomId());
        map.put("videoCallId", response.getVideoCallId());
        map.put("callerId", response.getCallerId());
        map.put("videoCallType", response.getVideoCallType());
        map.put("content", "Video call started"); 
        return map;
    }

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
            List<VideoCallParticipant> participantList = videoCallParticipantRepository.findByUser_UserId(userId);

            List<VideoCallResponse> responses = new ArrayList<>();
            for (VideoCallParticipant participant : participantList) {
                VideoCall videoCall = participant.getVideoCall();
                if (!videoCall.isDeleted()) {
                    responses.add(videoCallMapper.toResponse(videoCall));
                }
            }

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
            
            VideoCallStatus previousStatus = videoCall.getStatus();
            videoCallMapper.updateEntityFromRequest(request, videoCall);
            
            // Logic mới: Khi WebRTC kết nối thành công (ONGOING), reset lại Start Time 
            // để tính thời gian gọi thực tế (bỏ qua thời gian chờ INITIATED)
            if (request.getStatus() == VideoCallStatus.ONGOING && previousStatus == VideoCallStatus.INITIATED) {
                videoCall.setStartTime(OffsetDateTime.now());
            }

            // Handle End Call Logic
            if (request.getStatus() == VideoCallStatus.ENDED && previousStatus != VideoCallStatus.ENDED) {
                videoCall.setEndTime(OffsetDateTime.now());
                
                // Calculate duration
                int durationMinutes = 0;
                if (videoCall.getStartTime() != null) {
                    long seconds = Duration.between(videoCall.getStartTime(), videoCall.getEndTime()).getSeconds();
                    durationMinutes = (int) (seconds / 60);
                }

                // Update Progress for All Participants
                List<VideoCallParticipant> participants = videoCallParticipantRepository.findByVideoCall_VideoCallId(id);
                for (VideoCallParticipant p : participants) {
                    if (p.getStatus() == VideoCallParticipantStatus.CONNECTED || p.getRole() == VideoCallRole.HOST) {
                        
                        // 1. Update Daily Challenge (Speaking Practice & Learning Time)
                        if (dailyChallengeService != null) {
                            dailyChallengeService.updateChallengeProgress(p.getId().getUserId(), ChallengeType.SPEAKING_PRACTICE, Math.max(1, durationMinutes));
                            dailyChallengeService.updateChallengeProgress(p.getId().getUserId(), ChallengeType.LEARNING_TIME, durationMinutes);
                        }

                        // 2. Update Badge (Video Call Count)
                        if (badgeService != null) {
                            badgeService.updateBadgeProgress(p.getId().getUserId(), BadgeType.VIDEO_CALL_COUNT, 1);
                        }
                    }
                }
            }

            videoCall = videoCallRepository.save(videoCall);
            return videoCallMapper.toResponse(videoCall);
        } catch (Exception e) {
            log.error("Error while updating video call ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Transactional
    @Override
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