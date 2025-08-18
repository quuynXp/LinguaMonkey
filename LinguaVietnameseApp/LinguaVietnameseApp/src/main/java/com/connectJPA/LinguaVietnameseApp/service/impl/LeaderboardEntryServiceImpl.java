package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.LeaderboardEntryRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LeaderboardEntryResponse;
import com.connectJPA.LinguaVietnameseApp.entity.LeaderboardEntry;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
import com.connectJPA.LinguaVietnameseApp.mapper.LeaderboardEntryMapper;
import com.connectJPA.LinguaVietnameseApp.repository.LeaderboardEntryRepository;
import com.connectJPA.LinguaVietnameseApp.service.LeaderboardEntryService;
import com.connectJPA.LinguaVietnameseApp.service.UserService;
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
public class LeaderboardEntryServiceImpl implements LeaderboardEntryService {
    private final LeaderboardEntryRepository leaderboardEntryRepository;
    private final LeaderboardEntryMapper leaderboardEntryMapper;
    private final UserService userService;

    @Override
    @Cacheable(value = "leaderboardEntries", key = "#leaderboardId + ':' + #userId + ':' + #pageable.pageNumber + ':' + #pageable.pageSize")
    public Page<LeaderboardEntryResponse> getAllLeaderboardEntries(String leaderboardId, String userId, Pageable pageable) {
        try {
            if (pageable == null) {
                throw new AppException(ErrorCode.INVALID_PAGEABLE);
            }
            UUID leaderboardUuid = (leaderboardId != null) ? UUID.fromString(leaderboardId) : null;
            UUID userUuid = (userId != null) ? UUID.fromString(userId) : null;

            Page<LeaderboardEntry> entries =
                    leaderboardEntryRepository.findByLeaderboardIdAndUserIdAndIsDeletedFalse(leaderboardUuid, userUuid, pageable);

            return entries.map(entry -> {
                LeaderboardEntryResponse dto = leaderboardEntryMapper.toResponse(entry);
                User u = userService.findByUserId(entry.getUserId());
                dto.setName(u.getFullname());
                dto.setAvatarUrl(u.getAvatarUrl());
                return dto;
            });

        } catch (Exception e) {
            log.error("Error while fetching all leaderboard entries: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Cacheable(value = "leaderboardEntries", key = "#leaderboardId + ':' + #userId")
    public LeaderboardEntryResponse getLeaderboardEntryByIds(UUID leaderboardId, UUID userId) {
        try {
            if (leaderboardId == null || userId == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            LeaderboardEntry entry = leaderboardEntryRepository
                    .findByLeaderboardIdAndUserIdAndIsDeletedFalse(leaderboardId, userId)
                    .orElseThrow(() -> new AppException(ErrorCode.LEADERBOARD_ENTRY_NOT_FOUND));

            LeaderboardEntryResponse dto = leaderboardEntryMapper.toResponse(entry);

            User u = userService.findByUserId(userId);
            dto.setName(u.getFullname());
            dto.setAvatarUrl(u.getAvatarUrl());

            return dto;

        } catch (Exception e) {
            log.error("Error while fetching leaderboard entry by IDs {} and {}: {}", leaderboardId, userId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }


    @Override
    @Transactional
    @CachePut(value = "leaderboardEntries", key = "#result.leaderboardId + ':' + #result.userId")
    public LeaderboardEntryResponse createLeaderboardEntry(LeaderboardEntryRequest request) {
        try {
            if (request == null || request.getLeaderboardId() == null || request.getUserId() == null) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            LeaderboardEntry entry = leaderboardEntryMapper.toEntity(request);
            entry = leaderboardEntryRepository.save(entry);
            return leaderboardEntryMapper.toResponse(entry);
        } catch (Exception e) {
            log.error("Error while creating leaderboard entry: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CachePut(value = "leaderboardEntries", key = "#leaderboardId + ':' + #userId")
    public LeaderboardEntryResponse updateLeaderboardEntry(UUID leaderboardId, UUID userId, LeaderboardEntryRequest request) {
        try {
            if (leaderboardId == null || userId == null || request == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            LeaderboardEntry entry = leaderboardEntryRepository.findByLeaderboardIdAndUserIdAndIsDeletedFalse(leaderboardId, userId)
                    .orElseThrow(() -> new AppException(ErrorCode.LEADERBOARD_ENTRY_NOT_FOUND));
            leaderboardEntryMapper.updateEntityFromRequest(request, entry);
            entry = leaderboardEntryRepository.save(entry);
            return leaderboardEntryMapper.toResponse(entry);
        } catch (Exception e) {
            log.error("Error while updating leaderboard entry for {} and {}: {}", leaderboardId, userId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = "leaderboardEntries", key = "#leaderboardId + ':' + #userId")
    public void deleteLeaderboardEntry(UUID leaderboardId, UUID userId) {
        try {
            if (leaderboardId == null || userId == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            LeaderboardEntry entry = leaderboardEntryRepository.findByLeaderboardIdAndUserIdAndIsDeletedFalse(leaderboardId, userId)
                    .orElseThrow(() -> new AppException(ErrorCode.LEADERBOARD_ENTRY_NOT_FOUND));
            leaderboardEntryRepository.softDeleteByLeaderboardIdAndUserId(leaderboardId, userId);
        } catch (Exception e) {
            log.error("Error while deleting leaderboard entry for {} and {}: {}", leaderboardId, userId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }
}