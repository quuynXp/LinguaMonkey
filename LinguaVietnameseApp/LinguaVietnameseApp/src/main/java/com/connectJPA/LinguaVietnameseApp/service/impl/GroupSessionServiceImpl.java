package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.GroupSessionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.GroupSessionResponse;
import com.connectJPA.LinguaVietnameseApp.entity.GroupSession;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
import com.connectJPA.LinguaVietnameseApp.mapper.GroupSessionMapper;
import com.connectJPA.LinguaVietnameseApp.repository.GroupSessionRepository;
import com.connectJPA.LinguaVietnameseApp.service.GroupSessionService;
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
public class GroupSessionServiceImpl implements GroupSessionService {
    private final GroupSessionRepository groupSessionRepository;
    private final GroupSessionMapper groupSessionMapper;

    @Override
    @Cacheable(value = "groupSessions", key = "#lessonId + ':' + #roomId + ':' + #pageable.pageNumber + ':' + #pageable.pageSize")
    public Page<GroupSessionResponse> getAllGroupSessions(String lessonId, String roomId, Pageable pageable) {
        try {
            if (pageable == null) {
                throw new AppException(ErrorCode.INVALID_PAGEABLE);
            }
            UUID lessonUuid = (lessonId != null) ? UUID.fromString(lessonId) : null;
            UUID roomUuid = (roomId != null) ? UUID.fromString(roomId) : null;
            Page<GroupSession> sessions = groupSessionRepository.findByLessonIdAndRoomIdAndIsDeletedFalse(lessonUuid, roomUuid, pageable);
            return sessions.map(groupSessionMapper::toResponse);
        } catch (Exception e) {
            log.error("Error while fetching all group sessions: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Cacheable(value = "groupSessions", key = "#id")
    public GroupSessionResponse getGroupSessionById(UUID id) {
        try {
            if (id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            GroupSession session = groupSessionRepository.findByGroupSessionIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.GROUP_SESSION_NOT_FOUND));
            return groupSessionMapper.toResponse(session);
        } catch (Exception e) {
            log.error("Error while fetching group session by ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CachePut(value = "groupSessions", key = "#result.groupSessionId")
    public GroupSessionResponse createGroupSession(GroupSessionRequest request) {
        try {
            if (request == null || request.getLessonId() == null || request.getRoomId() == null) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            GroupSession session = groupSessionMapper.toEntity(request);
            session = groupSessionRepository.save(session);
            return groupSessionMapper.toResponse(session);
        } catch (Exception e) {
            log.error("Error while creating group session: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CachePut(value = "groupSessions", key = "#id")
    public GroupSessionResponse updateGroupSession(UUID id, GroupSessionRequest request) {
        try {
            if (id == null || request == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            GroupSession session = groupSessionRepository.findByGroupSessionIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.GROUP_SESSION_NOT_FOUND));
            groupSessionMapper.updateEntityFromRequest(request, session);
            session = groupSessionRepository.save(session);
            return groupSessionMapper.toResponse(session);
        } catch (Exception e) {
            log.error("Error while updating group session ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = "groupSessions", key = "#id")
    public void deleteGroupSession(UUID id) {
        try {
            if (id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            GroupSession session = groupSessionRepository.findByGroupSessionIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.GROUP_SESSION_NOT_FOUND));
            groupSessionRepository.softDeleteById(id);
        } catch (Exception e) {
            log.error("Error while deleting group session ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }
}