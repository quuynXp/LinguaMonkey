package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.VideoCallRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.VideoCallResponse;
import com.connectJPA.LinguaVietnameseApp.entity.VideoCall;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
import com.connectJPA.LinguaVietnameseApp.mapper.VideoCallMapper;
import com.connectJPA.LinguaVietnameseApp.repository.VideoCallRepository;
import com.connectJPA.LinguaVietnameseApp.service.VideoCallService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class VideoCallServiceImpl implements VideoCallService {
    private final VideoCallRepository videoCallRepository;
    private final VideoCallMapper videoCallMapper;

    @Override
    @Cacheable(value = "videoCalls", key = "#callerId + ':' + #status + ':' + #pageable.pageNumber + ':' + #pageable.pageSize")
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
    @Cacheable(value = "videoCalls", key = "#id")
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
    @Transactional
    @CachePut(value = "videoCalls", key = "#result.videoCallId")
    public VideoCallResponse createVideoCall(VideoCallRequest request) {
        try {
            if (request == null || request.getCallerId() == null) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            VideoCall videoCall = videoCallMapper.toEntity(request);
            videoCall = videoCallRepository.save(videoCall);
            return videoCallMapper.toResponse(videoCall);
        } catch (Exception e) {
            log.error("Error while creating video call: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CachePut(value = "videoCalls", key = "#id")
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
    @CacheEvict(value = "videoCalls", key = "#id")
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