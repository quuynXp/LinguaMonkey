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
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

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
    private final PlatformTransactionManager transactionManager;

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
            dto.setCountry(u.getCountry());
        }
        return dto;
    }

    @Override
    public Page<LeaderboardEntryResponse> getAllLeaderboardEntries(String leaderboardId, Pageable pageable) {
        try {
            if (pageable == null) throw new AppException(ErrorCode.INVALID_PAGEABLE);
            UUID leaderboardUuid = UUID.fromString(leaderboardId);
            
            Leaderboard leaderboard = leaderboardRepository.findByLeaderboardIdAndIsDeletedFalse(leaderboardUuid)
                    .orElseThrow(() -> new AppException(ErrorCode.LEADERBOARD_NOT_FOUND));

            String tab = leaderboard.getTab();
            Page<LeaderboardEntry> entries;

            if ("global".equalsIgnoreCase(tab)) {
                Pageable unsortedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
                entries = leaderboardEntryRepository.findEntriesWithLevelSort(leaderboardUuid, unsortedPageable);
            } else {
                Pageable effectivePageable = pageable.getSort().isUnsorted() 
                    ? PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by(Sort.Direction.DESC, "score"))
                    : pageable;
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
            Integer rank = "global".equalsIgnoreCase(leaderboard.getTab())
                ? leaderboardEntryRepository.calculateRankByLevelAndExp(leaderboardId, entry.getUser().getLevel(), entry.getUser().getExp())
                : leaderboardEntryRepository.calculateRankByScore(leaderboardId, entry.getScore());

            response.setRank(rank != null ? rank : 0);
            return response;
        } catch (Exception e) {
            log.error("Error fetching current user entry with rank: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public LeaderboardEntry ensureEntryExists(UUID userId, UUID leaderboardId) {
        return leaderboardEntryRepository.findByLeaderboardIdAndUserIdAndIsDeletedFalse(leaderboardId, userId)
                .orElseGet(() -> createEntryInNewTransaction(userId, leaderboardId));
    }

    private LeaderboardEntry createEntryInNewTransaction(UUID userId, UUID leaderboardId) {
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        template.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);

        try {
            return template.execute(status -> {
                User user = userRepository.findByUserIdAndIsDeletedFalse(userId)
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
                
                Leaderboard leaderboard = leaderboardRepository.findByLeaderboardIdAndIsDeletedFalse(leaderboardId)
                        .orElseThrow(() -> new AppException(ErrorCode.LEADERBOARD_NOT_FOUND));

                LeaderboardEntry newEntry = LeaderboardEntry.builder()
                        .leaderboardEntryId(new LeaderboardEntryId(leaderboardId, userId))
                        .user(user)
                        .leaderboard(leaderboard)
                        .score("coins".equalsIgnoreCase(leaderboard.getTab()) ? user.getCoins() : 0)
                        .level(user.getLevel())
                        .exp(user.getExp())
                        .isDeleted(false)
                        .build();

                return leaderboardEntryRepository.save(newEntry);
            });
        } catch (Exception e) {
            return leaderboardEntryRepository.findByLeaderboardIdAndUserIdAndIsDeletedFalse(leaderboardId, userId)
                    .orElseThrow(() -> new AppException(ErrorCode.LEADERBOARD_ENTRY_NOT_FOUND));
        }
    }

    @Override
    public LeaderboardEntryResponse getLeaderboardEntryByIds(UUID leaderboardId, Pageable pageable) {
        if (leaderboardId == null || pageable == null) throw new AppException(ErrorCode.INVALID_KEY);

        Leaderboard leaderboard = leaderboardRepository.findByLeaderboardIdAndIsDeletedFalse(leaderboardId)
                .orElseThrow(() -> new AppException(ErrorCode.LEADERBOARD_NOT_FOUND));
        
        Page<LeaderboardEntry> entries = "global".equalsIgnoreCase(leaderboard.getTab())
            ? leaderboardEntryRepository.findEntriesWithLevelSort(leaderboardId, PageRequest.of(pageable.getPageNumber(), pageable.getPageSize()))
            : leaderboardEntryRepository.findByLeaderboardIdAndIsDeletedFalse(leaderboardId, pageable);

        return entries.getContent().stream()
                .findFirst()
                .map(this::mapToResponseWithUserInfo)
                .orElse(null);
    }

    @Override
    @Transactional
    public LeaderboardEntryResponse createLeaderboardEntry(LeaderboardEntryRequest request) {
        LeaderboardEntry entry = leaderboardEntryMapper.toEntity(request);
        entry.setLeaderboard(leaderboardRepository.findByLeaderboardIdAndIsDeletedFalse(request.getLeaderboardId())
                .orElseThrow(() -> new AppException(ErrorCode.LEADERBOARD_NOT_FOUND)));
        entry.setUser(userRepository.findByUserIdAndIsDeletedFalse(request.getUserId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND)));

        entry = leaderboardEntryRepository.save(entry);
        return mapToResponseWithUserInfo(entry);
    }

    @Override
    @Transactional
    public LeaderboardEntryResponse updateLeaderboardEntry(UUID leaderboardId, UUID userId, LeaderboardEntryRequest request) {
        LeaderboardEntry entry = leaderboardEntryRepository.findByLeaderboardIdAndUserIdAndIsDeletedFalse(leaderboardId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.LEADERBOARD_ENTRY_NOT_FOUND));

        leaderboardEntryMapper.updateEntityFromRequest(request, entry);
        entry = leaderboardEntryRepository.save(entry);
        return mapToResponseWithUserInfo(entry);
    }

    @Override
    @Transactional
    public void deleteLeaderboardEntry(UUID leaderboardId, UUID userId) {
        leaderboardEntryRepository.findByLeaderboardIdAndUserIdAndIsDeletedFalse(leaderboardId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.LEADERBOARD_ENTRY_NOT_FOUND));

        leaderboardEntryRepository.softDeleteByLeaderboardIdAndUserId(leaderboardId, userId);
    }

    @Override
    public List<LeaderboardEntryResponse> getTop3LeaderboardEntries(UUID leaderboardId) {
        Pageable pageable = PageRequest.of(0, 3);
        return leaderboardEntryRepository.findTop3ByLeaderboardIdOrderByUserLevelDesc(leaderboardId, pageable)
                .stream()
                .map(this::mapToResponseWithUserInfo)
                .collect(Collectors.toList());
    }

    @Override
    public List<LeaderboardEntryResponse> getTop3GlobalLeaderboardEntries() {
        Leaderboard leaderboard = leaderboardRepository.findMostRecentByTab("global")
                .orElseThrow(() -> new AppException(ErrorCode.LEADERBOARD_NOT_FOUND));

        return getTop3LeaderboardEntries(leaderboard.getLeaderboardId());
    }

    @Override
    public Integer getRankForUserByTab(String tab, String type, UUID userId) {
        return leaderboardEntryRepository.findRankByUserAndTab(userId, tab);
    }

    @Override
    @Transactional
    public void updateScore(UUID leaderboardId, UUID userId, double score) {
        LeaderboardEntry entry = ensureEntryExists(userId, leaderboardId);
        entry.setScore((int) score);
        leaderboardEntryRepository.save(entry);
    }
}