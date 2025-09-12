package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.LeaderboardRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LeaderboardResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Leaderboard;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
import com.connectJPA.LinguaVietnameseApp.mapper.LeaderboardMapper;
import com.connectJPA.LinguaVietnameseApp.repository.LeaderboardRepository;
import com.connectJPA.LinguaVietnameseApp.service.LeaderboardService;
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
public class LeaderboardServiceImpl implements LeaderboardService {
    private final LeaderboardRepository leaderboardRepository;
    private final LeaderboardMapper leaderboardMapper;

    @Override
    public Page<LeaderboardResponse> getAllLeaderboards(String period, String tab, Pageable pageable) {
        try {
            if (pageable == null) {
                throw new AppException(ErrorCode.INVALID_PAGEABLE);
            }
            Page<Leaderboard> leaderboards = leaderboardRepository.findByPeriodAndTabAndIsDeletedFalse(period, tab, pageable);
            return leaderboards.map(leaderboardMapper::toResponse);
        } catch (Exception e) {
            log.error("Error while fetching all leaderboards: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public LeaderboardResponse getLeaderboardById(UUID id) {
        try {
            if (id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            Leaderboard leaderboard = leaderboardRepository.findByLeaderboardIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.LEADERBOARD_NOT_FOUND));
            return leaderboardMapper.toResponse(leaderboard);
        } catch (Exception e) {
            log.error("Error while fetching leaderboard by ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public LeaderboardResponse createLeaderboard(LeaderboardRequest request) {
        try {
            if (request == null) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            Leaderboard leaderboard = leaderboardMapper.toEntity(request);
            leaderboard = leaderboardRepository.save(leaderboard);
            return leaderboardMapper.toResponse(leaderboard);
        } catch (Exception e) {
            log.error("Error while creating leaderboard: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public LeaderboardResponse updateLeaderboard(UUID id, LeaderboardRequest request) {
        try {
            if (id == null || request == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            Leaderboard leaderboard = leaderboardRepository.findByLeaderboardIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.LEADERBOARD_NOT_FOUND));
            leaderboardMapper.updateEntityFromRequest(request, leaderboard);
            leaderboard = leaderboardRepository.save(leaderboard);
            return leaderboardMapper.toResponse(leaderboard);
        } catch (Exception e) {
            log.error("Error while updating leaderboard ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public void deleteLeaderboard(UUID id) {
        try {
            if (id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            Leaderboard leaderboard = leaderboardRepository.findByLeaderboardIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.LEADERBOARD_NOT_FOUND));
            leaderboardRepository.softDeleteById(id);
        } catch (Exception e) {
            log.error("Error while deleting leaderboard ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }
}