package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.LeaderboardEntryRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LeaderboardEntryResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Leaderboard;
import com.connectJPA.LinguaVietnameseApp.entity.LeaderboardEntry;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.entity.id.LeaderboardEntryId;
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

    private LeaderboardEntryResponse mapToResponseWithUserInfo(LeaderboardEntry entry) {
        LeaderboardEntryResponse dto = leaderboardEntryMapper.toResponse(entry);
        User u = entry.getUser();
        if (u != null) {
            dto.setAvatarUrl(u.getAvatarUrl());
            dto.setFullname(u.getFullname());
            dto.setNickname(u.getNickname());
            dto.setLevel(u.getLevel());
            dto.setGender(u.getGender());
            dto.setExp(u.getExp());
            dto.setCountry(u.getCountry()); // Map EXP từ User để hiển thị riêng
        }
        return dto;
    }

    @Override
    public Page<LeaderboardEntryResponse> getAllLeaderboardEntries(String leaderboardId, Pageable pageable) {
        try {
            if (pageable == null) throw new AppException(ErrorCode.INVALID_PAGEABLE);
            if (leaderboardId == null || leaderboardId.trim().isEmpty()) throw new AppException(ErrorCode.INVALID_KEY);

            UUID leaderboardUuid = UUID.fromString(leaderboardId);
            Leaderboard leaderboard = leaderboardRepository.findByLeaderboardIdAndIsDeletedFalse(leaderboardUuid)
                    .orElseThrow(() -> new AppException(ErrorCode.LEADERBOARD_NOT_FOUND));

            String tab = leaderboard.getTab();
            Page<LeaderboardEntry> entries;

            if ("global".equalsIgnoreCase(tab)) {
                Pageable unsortedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
                entries = leaderboardEntryRepository.findEntriesWithLevelSort(leaderboardUuid, unsortedPageable);
            } else {
                Pageable effectivePageable = pageable;
                if (pageable.getSort().isUnsorted()) {
                    effectivePageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by(Sort.Direction.DESC, "score"));
                }
                entries = leaderboardEntryRepository.findByLeaderboardIdAndIsDeletedFalse(leaderboardUuid, effectivePageable);
            }

            return entries.map(this::mapToResponseWithUserInfo);
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error fetching entries: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public LeaderboardEntryResponse getCurrentUserEntryWithRank(UUID leaderboardId, UUID userId) {
        try {
            LeaderboardEntry entry = ensureEntryExists(userId, leaderboardId);
            LeaderboardEntryResponse response = mapToResponseWithUserInfo(entry);

            Leaderboard leaderboard = entry.getLeaderboard();
            Integer rank;

            if ("global".equalsIgnoreCase(leaderboard.getTab())) {
                User u = entry.getUser();
                rank = leaderboardEntryRepository.calculateRankByLevelAndExp(leaderboardId, u.getLevel(), u.getExp());
            } else {
                // For Hours, Coins, Admire - mapped to 'score'
                rank = leaderboardEntryRepository.calculateRankByScore(leaderboardId, entry.getScore());
            }

            response.setRank(rank != null ? rank : 0);
            return response;
        } catch (Exception e) {
            log.error("Error fetching current user entry with rank: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public LeaderboardEntry ensureEntryExists(UUID userId, UUID leaderboardId) {
        return leaderboardEntryRepository.findByLeaderboardIdAndUserIdAndIsDeletedFalse(leaderboardId, userId)
                .orElseGet(() -> {
                    User user = userRepository.findByUserIdAndIsDeletedFalse(userId)
                            .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
                    
                    Leaderboard leaderboard = leaderboardRepository.findByLeaderboardIdAndIsDeletedFalse(leaderboardId)
                            .orElseThrow(() -> new AppException(ErrorCode.LEADERBOARD_NOT_FOUND));

                    LeaderboardEntry newEntry = new LeaderboardEntry();
                    newEntry.setLeaderboardEntryId(new LeaderboardEntryId(leaderboardId, userId));
                    newEntry.setUser(user);
                    newEntry.setLeaderboard(leaderboard);
                    
                    if ("coins".equalsIgnoreCase(leaderboard.getTab())) {
                        newEntry.setScore(user.getCoins());
                    } else {
                        newEntry.setScore(0);
                    }
                    
                    newEntry.setDeleted(false);
                    return leaderboardEntryRepository.save(newEntry);
                });
    }

    @Override
    public LeaderboardEntryResponse getLeaderboardEntryByIds(UUID leaderboardId, Pageable pageable) {
        try {
            if (pageable == null) throw new AppException(ErrorCode.INVALID_PAGEABLE);
            if (leaderboardId == null) throw new AppException(ErrorCode.INVALID_KEY);

            Leaderboard leaderboard = leaderboardRepository.findByLeaderboardIdAndIsDeletedFalse(leaderboardId)
                    .orElseThrow(() -> new AppException(ErrorCode.LEADERBOARD_NOT_FOUND));
            
            String tab = leaderboard.getTab();
            Page<LeaderboardEntry> entries;

            if ("global".equalsIgnoreCase(tab) || "couples".equalsIgnoreCase(tab) || "country".equalsIgnoreCase(tab)) {
                   Pageable unsortedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
                   entries = leaderboardEntryRepository.findEntriesWithLevelSort(leaderboardId, unsortedPageable);
            } else {
                Pageable effectivePageable = pageable;
                if (pageable.getSort().isUnsorted()) {
                    effectivePageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by(Sort.Direction.DESC, "score"));
                }
                entries = leaderboardEntryRepository.findByLeaderboardIdAndIsDeletedFalse(leaderboardId, effectivePageable);
            }

            return entries.getContent().stream()
                    .findFirst()
                    .map(this::mapToResponseWithUserInfo)
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
            return mapToResponseWithUserInfo(entry);
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
            return mapToResponseWithUserInfo(entry);
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

    @Override
    public List<LeaderboardEntryResponse> getTop3LeaderboardEntries(UUID leaderboardId) {
        try {
            if (leaderboardId == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }

            Pageable pageable = PageRequest.of(0, 3);
            List<LeaderboardEntry> entries = leaderboardEntryRepository.findTop3ByLeaderboardIdOrderByUserLevelDesc(leaderboardId, pageable);

            return entries.stream()
                    .map(this::mapToResponseWithUserInfo)
                    .collect(Collectors.toList());
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
        } catch (AppException e) {
            if (e.getErrorCode() == ErrorCode.LEADERBOARD_NOT_FOUND) {
                log.warn("Global leaderboard not found for Top 3.");
                return List.of();
            }
            throw e;
        } catch (Exception e) {
            log.error("Error while fetching top 3 global leaderboard entries: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public Integer getRankForUserByTab(String tab, String type, UUID userId) {
        return leaderboardEntryRepository.findRankByUserAndTab(userId, tab);
    }
}