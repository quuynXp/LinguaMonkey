package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.LeaderboardEntryRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LeaderboardEntryResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Leaderboard;
import com.connectJPA.LinguaVietnameseApp.entity.LeaderboardEntry;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
import com.connectJPA.LinguaVietnameseApp.mapper.LeaderboardEntryMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LeaderboardEntryRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LeaderboardRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.LeaderboardEntryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LeaderboardEntryServiceImpl implements LeaderboardEntryService {

    private final LeaderboardEntryRepository leaderboardEntryRepository;
    private final LeaderboardEntryMapper leaderboardEntryMapper;
    private final UserRepository userRepository;
    private final LeaderboardRepository leaderboardRepository;

    @Override
    public Page<LeaderboardEntryResponse> getAllLeaderboardEntries(String leaderboardId, Pageable pageable) {
        try {
            if (pageable == null) {
                throw new AppException(ErrorCode.INVALID_PAGEABLE);
            }

            UUID leaderboardUuid = (leaderboardId != null) ? UUID.fromString(leaderboardId) : null;

            // Get leaderboard to determine sorting
            Leaderboard leaderboard = leaderboardRepository.findByLeaderboardIdAndIsDeletedFalse(leaderboardUuid)
                    .orElseThrow(() -> new AppException(ErrorCode.LEADERBOARD_NOT_FOUND));

            String tab = leaderboard.getTab();

            // Apply default sort if none provided
            Pageable effectivePageable = pageable;
            if (pageable.getSort().isUnsorted()) {
                Sort defaultSort;

                // Sort by level DESC for global/level-based tabs
                if ("global".equalsIgnoreCase(tab) || "couples".equalsIgnoreCase(tab) || "country".equalsIgnoreCase(tab)) {
                    defaultSort = Sort.by(Sort.Direction.DESC, "user.level", "score");
                } else {
                    // Sort by score DESC for other tabs
                    defaultSort = Sort.by(Sort.Direction.DESC, "score");
                }

                effectivePageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), defaultSort);
            }

            // Fetch entries
            Page<LeaderboardEntry> entries = leaderboardEntryRepository.findByLeaderboardIdAndIsDeletedFalse(leaderboardUuid, effectivePageable);

            // Map to DTO with user info
            return entries.map(entry -> {
                LeaderboardEntryResponse dto = leaderboardEntryMapper.toResponse(entry);
                userRepository.findByUserIdAndIsDeletedFalse(entry.getLeaderboardEntryId().getUserId())
                        .ifPresent(u -> {
                            dto.setAvatarUrl(u.getAvatarUrl());
                            dto.setFullname(u.getFullname());
                            dto.setNickname(u.getNickname());
                            dto.setLevel(u.getLevel());
                        });
                return dto;
            });

        } catch (Exception e) {
            log.error("Error while fetching all leaderboard entries: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public LeaderboardEntryResponse getLeaderboardEntryByIds(UUID leaderboardId, Pageable pageable) {
        try {
            if (pageable == null) {
                throw new AppException(ErrorCode.INVALID_PAGEABLE);
            }
            if (leaderboardId == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }

            // Get leaderboard for sorting logic
            Leaderboard leaderboard = leaderboardRepository.findByLeaderboardIdAndIsDeletedFalse(leaderboardId)
                    .orElseThrow(() -> new AppException(ErrorCode.LEADERBOARD_NOT_FOUND));

            String tab = leaderboard.getTab();

            Pageable effectivePageable = pageable;
            if (pageable.getSort().isUnsorted()) {
                Sort defaultSort;
                if ("global".equalsIgnoreCase(tab) || "couples".equalsIgnoreCase(tab) || "country".equalsIgnoreCase(tab)) {
                    defaultSort = Sort.by(Sort.Direction.DESC, "user.level", "score");
                } else {
                    defaultSort = Sort.by(Sort.Direction.DESC, "score");
                }
                effectivePageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), defaultSort);
            }

            Page<LeaderboardEntry> entries = leaderboardEntryRepository.findByLeaderboardIdAndIsDeletedFalse(leaderboardId, effectivePageable);

            // Return first entry
            return entries.getContent().stream()
                    .findFirst()
                    .map(entry -> {
                        LeaderboardEntryResponse dto = leaderboardEntryMapper.toResponse(entry);
                        userRepository.findByUserIdAndIsDeletedFalse(entry.getLeaderboardEntryId().getUserId())
                                .ifPresent(u -> {
                                    dto.setAvatarUrl(u.getAvatarUrl());
                                    dto.setFullname(u.getFullname());
                                    dto.setNickname(u.getNickname());
                                    dto.setLevel(u.getLevel());
                                });
                        return dto;
                    })
                    .orElse(null);

        } catch (Exception e) {
            log.error("Error while fetching leaderboard entry: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public LeaderboardEntryResponse createLeaderboardEntry(LeaderboardEntryRequest request) {
        try {
            if (request == null || request.getLeaderboardId() == null || request.getUserId() == null) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }

            LeaderboardEntry entry = leaderboardEntryMapper.toEntity(request);
            entry.setLeaderboard(leaderboardRepository.findByLeaderboardIdAndIsDeletedFalse(request.getLeaderboardId())
                    .orElseThrow(() -> new AppException(ErrorCode.LEADERBOARD_NOT_FOUND)));
            entry.setUser(userRepository.findByUserIdAndIsDeletedFalse(request.getUserId())
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND)));

            entry = leaderboardEntryRepository.save(entry);
            return leaderboardEntryMapper.toResponse(entry);
        } catch (Exception e) {
            log.error("Error while creating leaderboard entry: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public LeaderboardEntryResponse updateLeaderboardEntry(UUID leaderboardId, UUID userId, LeaderboardEntryRequest request) {
        try {
            if (leaderboardId == null || userId == null || request == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }

            LeaderboardEntry entry = leaderboardEntryRepository.findByLeaderboardIdAndUserIdAndIsDeletedFalse(leaderboardId, userId)
                    .orElseThrow(() -> new AppException(ErrorCode.LEADERBOARD_ENTRY_NOT_FOUND));

            leaderboardEntryMapper.updateEntityFromRequest(request, entry);
            entry.setLeaderboard(leaderboardRepository.findByLeaderboardIdAndIsDeletedFalse(request.getLeaderboardId())
                    .orElseThrow(() -> new AppException(ErrorCode.LEADERBOARD_NOT_FOUND)));
            entry.setUser(userRepository.findByUserIdAndIsDeletedFalse(request.getUserId())
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND)));

            entry = leaderboardEntryRepository.save(entry);
            return leaderboardEntryMapper.toResponse(entry);
        } catch (Exception e) {
            log.error("Error while updating leaderboard entry for {} and {}: {}", leaderboardId, userId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public void deleteLeaderboardEntry(UUID leaderboardId, UUID userId) {
        try {
            if (leaderboardId == null || userId == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }

            leaderboardEntryRepository.findByLeaderboardIdAndUserIdAndIsDeletedFalse(leaderboardId, userId)
                    .orElseThrow(() -> new AppException(ErrorCode.LEADERBOARD_ENTRY_NOT_FOUND));

            leaderboardEntryRepository.softDeleteByLeaderboardIdAndUserId(leaderboardId, userId);
        } catch (Exception e) {
            log.error("Error while deleting leaderboard entry for {} and {}: {}", leaderboardId, userId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    // Get top 3 for specific leaderboard
    @Override
    public List<LeaderboardEntryResponse> getTop3LeaderboardEntries(UUID leaderboardId) {
        try {
            if (leaderboardId == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }

            Pageable pageable = PageRequest.of(0, 3, Sort.by(Sort.Direction.DESC, "user.level", "score"));
            List<LeaderboardEntry> entries = leaderboardEntryRepository.findTop3ByLeaderboardIdOrderByUserLevelDesc(leaderboardId, pageable);

            return entries.stream().map(entry -> {
                LeaderboardEntryResponse dto = leaderboardEntryMapper.toResponse(entry);
                userRepository.findByUserIdAndIsDeletedFalse(entry.getLeaderboardEntryId().getUserId())
                        .ifPresent(u -> {
                            dto.setAvatarUrl(u.getAvatarUrl());
                            dto.setFullname(u.getFullname());
                            dto.setNickname(u.getNickname());
                            dto.setLevel(u.getLevel());
                        });
                return dto;
            }).collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Error while fetching top 3 leaderboard entries for {}: {}", leaderboardId, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public List<LeaderboardEntryResponse> getTop3GlobalLeaderboardEntries() {
        try {
            Leaderboard leaderboard = leaderboardRepository.findMostRecentByTab("global")
                    .orElseThrow(() -> new AppException(ErrorCode.LEADERBOARD_NOT_FOUND));

            return getTop3LeaderboardEntries(leaderboard.getLeaderboardId());
        } catch (Exception e) {
            log.error("Error while fetching top 3 global leaderboard entries: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public Integer getRankForUserByTab(String tab, String type, UUID userId) {
        return leaderboardEntryRepository.findRankByUserAndTab(userId, tab, type);
    }
}