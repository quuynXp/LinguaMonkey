package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.GroupAnswerRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.GroupAnswerResponse;
import com.connectJPA.LinguaVietnameseApp.entity.GroupAnswer;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
import com.connectJPA.LinguaVietnameseApp.mapper.GroupAnswerMapper;
import com.connectJPA.LinguaVietnameseApp.repository.GroupAnswerRepository;
import com.connectJPA.LinguaVietnameseApp.service.GroupAnswerService;
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
public class GroupAnswerServiceImpl implements GroupAnswerService {
    private final GroupAnswerRepository groupAnswerRepository;
    private final GroupAnswerMapper groupAnswerMapper;

    @Override
    @Cacheable(value = "groupAnswers", key = "#groupSessionId + ':' + #userId + ':' + #pageable.pageNumber + ':' + #pageable.pageSize")
    public Page<GroupAnswerResponse> getAllGroupAnswers(String groupSessionId, String userId, Pageable pageable) {
        try {
            if (pageable == null) {
                throw new AppException(ErrorCode.INVALID_PAGEABLE);
            }
            UUID groupSessionUuid = (groupSessionId != null) ? UUID.fromString(groupSessionId) : null;
            UUID userUuid = (userId != null) ? UUID.fromString(userId) : null;
            Page<GroupAnswer> answers = groupAnswerRepository.findByGroupSessionIdAndUserIdAndIsDeletedFalse(groupSessionUuid, userUuid, pageable);
            return answers.map(groupAnswerMapper::toResponse);
        } catch (Exception e) {
            log.error("Error while fetching all group answers: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Cacheable(value = "groupAnswers", key = "#groupSessionId + ':' + #userId")
    public GroupAnswerResponse getGroupAnswerByIds(UUID groupSessionId, UUID userId) {
        try {
            if (groupSessionId == null || userId == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            GroupAnswer answer = groupAnswerRepository.findByGroupSessionIdAndUserIdAndIsDeletedFalse(groupSessionId, userId)
                    .orElseThrow(() -> new AppException(ErrorCode.GROUP_ANSWER_NOT_FOUND));
            return groupAnswerMapper.toResponse(answer);
        } catch (Exception e) {
            log.error("Error while fetching group answer by IDs {} and {}: {}", groupSessionId, userId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CachePut(value = "groupAnswers", key = "#result.groupSessionId + ':' + #result.userId")
    public GroupAnswerResponse createGroupAnswer(GroupAnswerRequest request) {
        try {
            if (request == null || request.getGroupSessionId() == null || request.getUserId() == null) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            GroupAnswer answer = groupAnswerMapper.toEntity(request);
            answer = groupAnswerRepository.save(answer);
            return groupAnswerMapper.toResponse(answer);
        } catch (Exception e) {
            log.error("Error while creating group answer: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CachePut(value = "groupAnswers", key = "#groupSessionId + ':' + #userId")
    public GroupAnswerResponse updateGroupAnswer(UUID groupSessionId, UUID userId, GroupAnswerRequest request) {
        try {
            if (groupSessionId == null || userId == null || request == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            GroupAnswer answer = groupAnswerRepository.findByGroupSessionIdAndUserIdAndIsDeletedFalse(groupSessionId, userId)
                    .orElseThrow(() -> new AppException(ErrorCode.GROUP_ANSWER_NOT_FOUND));
            groupAnswerMapper.updateEntityFromRequest(request, answer);
            answer = groupAnswerRepository.save(answer);
            return groupAnswerMapper.toResponse(answer);
        } catch (Exception e) {
            log.error("Error while updating group answer for {} and {}: {}", groupSessionId, userId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = "groupAnswers", key = "#groupSessionId + ':' + #userId")
    public void deleteGroupAnswer(UUID groupSessionId, UUID userId) {
        try {
            if (groupSessionId == null || userId == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            GroupAnswer answer = groupAnswerRepository.findByGroupSessionIdAndUserIdAndIsDeletedFalse(groupSessionId, userId)
                    .orElseThrow(() -> new AppException(ErrorCode.GROUP_ANSWER_NOT_FOUND));
            groupAnswerRepository.softDeleteByGroupSessionIdAndUserId(groupSessionId, userId);
        } catch (Exception e) {
            log.error("Error while deleting group answer for {} and {}: {}", groupSessionId, userId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }
}