package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.LeaderboardRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LeaderboardEntryResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.LeaderboardResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Leaderboard;
import com.connectJPA.LinguaVietnameseApp.entity.LeaderboardEntry;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
import com.connectJPA.LinguaVietnameseApp.mapper.LeaderboardEntryMapper;
import com.connectJPA.LinguaVietnameseApp.mapper.LeaderboardMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LeaderboardEntryRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LeaderboardRepository;
import com.connectJPA.LinguaVietnameseApp.service.LeaderboardEntryService; // Import service mới
import com.connectJPA.LinguaVietnameseApp.service.LeaderboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LeaderboardServiceImpl implements LeaderboardService {

    private final LeaderboardRepository leaderboardRepository;
    private final LeaderboardMapper leaderboardMapper;
    private final UserRepository userRepository;
    private final LeaderboardEntryRepository leaderboardEntryRepository;
    private final LeaderboardEntryMapper leaderboardEntryMapper;
    private final LeaderboardEntryService leaderboardEntryService; // Inject service mới/liên quan


    @Override
    public Page<LeaderboardResponse> getAllLeaderboards(String tab, Pageable pageable) {
        try {
            if (pageable == null) {
                throw new AppException(ErrorCode.INVALID_PAGEABLE);
            }

            Page<Leaderboard> leaderboards = leaderboardRepository.findLatestByTabAndIsDeletedFalse(tab, pageable);
            return leaderboards.map(leaderboardMapper::toResponse);
        } catch (Exception e) {
            log.error("Error while fetching all leaderboards for tab {}: {}", tab, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    // [Cập nhật] Hàm này sẽ gọi đến logic trong LeaderboardEntryService
    @Override
    public List<LeaderboardEntryResponse> getGlobalTopThree() {
        // Chuyển logic lấy Top 3 Global sang LeaderboardEntryService để đảm bảo Top 3
        // của HomeScreen là Top 3 của Leaderboard Global hiện tại (dữ liệu Entry)
        return leaderboardEntryService.getTop3GlobalLeaderboardEntries();
    }

    // [NEW] Hàm được LeaderboardController sử dụng cho /top-3
    @Override
    public List<LeaderboardEntryResponse> getTop3GlobalLeaderboardEntries() {
        return leaderboardEntryService.getTop3GlobalLeaderboardEntries();
    }

    // [Cập nhật] Implementation for getting top 3 by leaderboard ID
    // Logic này nên ở LeaderboardEntryServiceImpl, ta gọi lại thôi
    @Override
    public List<LeaderboardEntryResponse> getLeaderboardTopThreeById(UUID leaderboardId) {
        return leaderboardEntryService.getTop3LeaderboardEntries(leaderboardId);
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