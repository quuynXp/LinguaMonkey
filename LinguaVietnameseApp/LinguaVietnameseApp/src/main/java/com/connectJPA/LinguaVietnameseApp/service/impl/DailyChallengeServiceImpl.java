package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.response.DailyChallengeUpdateResponse;
import com.connectJPA.LinguaVietnameseApp.entity.DailyChallenge;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.entity.UserDailyChallenge;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserDailyChallengeId;
import com.connectJPA.LinguaVietnameseApp.enums.ChallengePeriod;
import com.connectJPA.LinguaVietnameseApp.enums.ChallengeStatus;
import com.connectJPA.LinguaVietnameseApp.enums.ChallengeType;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.DailyChallengeRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserDailyChallengeRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.DailyChallengeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DailyChallengeServiceImpl implements DailyChallengeService {

    private final UserDailyChallengeRepository userDailyChallengeRepository;
    private final DailyChallengeRepository dailyChallengeRepository;
    private final UserRepository userRepository;

    @Override
    public List<UserDailyChallenge> getTodayChallenges(UUID userId) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        
        // Time range cho Daily: 00:00 -> 23:59 hôm nay
        OffsetDateTime startOfDay = now.truncatedTo(ChronoUnit.DAYS);
        OffsetDateTime endOfDay = startOfDay.plusDays(1).minusNanos(1);

        // Time range cho Weekly: 00:00 Thứ 2 -> 23:59 Chủ nhật (hoặc hiện tại)
        OffsetDateTime startOfWeek = now.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).truncatedTo(ChronoUnit.DAYS);

        // 1. Lấy thông tin User
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        String userLang = (user.getNativeLanguageCode() != null && !user.getNativeLanguageCode().isEmpty()) 
                          ? user.getNativeLanguageCode() 
                          : "vi";

        // 2. Lấy danh sách Challenge hệ thống (Limit 20 để cover cả daily và weekly)
        List<DailyChallenge> allSystemChallenges = dailyChallengeRepository
                .findByLanguageCodeAndIsDeletedFalse(userLang)
                .stream()
                .limit(20)
                .collect(Collectors.toList());

        // 3. Lấy tiến độ của User.
        // QUAN TRỌNG: Query từ đầu tuần để lấy được cả Weekly progress đã làm từ hôm qua.
        // Filter logic sẽ xử lý việc Daily cũ bị lọt vào sau.
        List<UserDailyChallenge> userProgressList = userDailyChallengeRepository.findChallengesForToday(userId, startOfWeek, endOfDay);
        
        // Map để lookup nhanh progress
        // Key logic: ChallengeId + AssignedDate (để phân biệt daily hôm qua và hôm nay)
        // Tuy nhiên để đơn giản hoá hiển thị, ta sẽ filter list trên memory
        
        List<UserDailyChallenge> result = new ArrayList<>();

        for (DailyChallenge sysChallenge : allSystemChallenges) {
            UserDailyChallenge existingProgress = null;

            if (sysChallenge.getPeriod() == ChallengePeriod.WEEKLY) {
                // Với Weekly: Tìm record nào nằm trong khoảng từ đầu tuần đến giờ
                existingProgress = userProgressList.stream()
                    .filter(u -> u.getChallenge().getId().equals(sysChallenge.getId()))
                    .filter(u -> !u.getAssignedAt().isBefore(startOfWeek)) // Phải thuộc tuần này
                    .findFirst() // Lấy cái đầu tiên tìm thấy (thường weekly chỉ có 1 record/tuần)
                    .orElse(null);
            } else {
                // Với Daily: Tìm record của CHÍNH XÁC hôm nay
                existingProgress = userProgressList.stream()
                    .filter(u -> u.getChallenge().getId().equals(sysChallenge.getId()))
                    .filter(u -> u.getAssignedAt().isAfter(startOfDay.minusNanos(1)) && u.getAssignedAt().isBefore(endOfDay.plusNanos(1)))
                    .findFirst()
                    .orElse(null);
            }

            if (existingProgress != null) {
                result.add(existingProgress);
            } else {
                // Tạo record ảo (Virtual) cho FE hiển thị
                UserDailyChallenge virtualRecord = UserDailyChallenge.builder()
                        .id(UserDailyChallengeId.builder()
                                .userId(userId)
                                .challengeId(sysChallenge.getId())
                                .assignedDate(now) // Gán tạm ngày hiện tại
                                .build())
                        .challenge(sysChallenge)
                        .progress(0)
                        .targetAmount(sysChallenge.getTargetAmount())
                        .isCompleted(false)
                        .status(ChallengeStatus.IN_PROGRESS)
                        .expReward(sysChallenge.getBaseExp())
                        .rewardCoins(sysChallenge.getRewardCoins())
                        .build();
                result.add(virtualRecord);
            }
        }

        // 5. SORT: CAN_CLAIM (1) -> IN_PROGRESS (2) -> CLAIMED (3)
        return result.stream()
                .sorted(Comparator.comparingInt((UserDailyChallenge c) -> {
                    if (c.getStatus() == ChallengeStatus.CAN_CLAIM) return 1;
                    if (c.getStatus() == ChallengeStatus.IN_PROGRESS) return 2;
                    if (c.getStatus() == ChallengeStatus.CLAIMED) return 3;
                    return 4;
                }))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void claimReward(UUID userId, UUID challengeId) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        // Mở rộng range check để cover trường hợp Weekly claim vào cuối tuần
        OffsetDateTime startOfWeek = now.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).truncatedTo(ChronoUnit.DAYS);
        OffsetDateTime endOfDay = now.truncatedTo(ChronoUnit.DAYS).plusDays(1).minusNanos(1);

        // Tìm challenge trong DB (có thể là record hôm nay hoặc từ đầu tuần)
        UserDailyChallenge challenge = userDailyChallengeRepository.findClaimableChallenge(userId, challengeId, startOfWeek, endOfDay)
                .orElseThrow(() -> new RuntimeException("Nhiệm vụ chưa hoàn thành hoặc không tồn tại!"));

        if (challenge.getStatus() == ChallengeStatus.CLAIMED) {
             throw new RuntimeException("Challenge already claimed!"); // Throw để FE catch
        }

        challenge.setStatus(ChallengeStatus.CLAIMED);
        challenge.setClaimedAt(now);
        userDailyChallengeRepository.save(challenge);

        User user = userRepository.findById(userId).orElseThrow();
        user.setExp(user.getExp() + challenge.getExpReward());
        user.setCoins(user.getCoins() + challenge.getRewardCoins());
        userRepository.save(user);
    }

    @Override
    @Transactional
    public DailyChallengeUpdateResponse updateChallengeProgress(UUID userId, ChallengeType challengeType, int increment) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime startOfDay = now.truncatedTo(ChronoUnit.DAYS);
        OffsetDateTime endOfDay = startOfDay.plusDays(1).minusNanos(1);
        OffsetDateTime startOfWeek = now.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).truncatedTo(ChronoUnit.DAYS);

        // Query rộng từ đầu tuần
        List<UserDailyChallenge> activeChallenges = userDailyChallengeRepository.findChallengesForToday(userId, startOfWeek, endOfDay);
        
        // Tìm target phù hợp
        UserDailyChallenge target = activeChallenges.stream()
            .filter(udc -> !udc.isCompleted() && udc.getChallenge().getChallengeType() == challengeType)
            .filter(udc -> {
                // Logic filter chính xác
                if (udc.getChallenge().getPeriod() == ChallengePeriod.WEEKLY) return true; // Weekly thì lấy luôn (vì đã query từ startOfWeek)
                return udc.getAssignedAt().isAfter(startOfDay.minusNanos(1)); // Daily thì phải là hôm nay
            })
            .findFirst()
            .orElse(null);

        if (target == null) {
             // Logic insert mới nếu chưa có (Tự động insert Weekly nếu chưa có record tuần này, Daily nếu chưa có record hôm nay)
             User user = userRepository.findById(userId).orElseThrow();
             String userLang = user.getNativeLanguageCode() != null ? user.getNativeLanguageCode() : "vi";

             List<DailyChallenge> systemChallenges = dailyChallengeRepository.findByLanguageCodeAndIsDeletedFalse(userLang);
             DailyChallenge matchingSystemChallenge = systemChallenges.stream()
                 .filter(dc -> dc.getChallengeType() == challengeType)
                 .findFirst()
                 .orElse(null);
             
             if (matchingSystemChallenge == null) return null;

             target = UserDailyChallenge.builder()
                 .id(UserDailyChallengeId.builder().userId(userId).challengeId(matchingSystemChallenge.getId()).assignedDate(now).build())
                 .user(userRepository.getReferenceById(userId))
                 .challenge(matchingSystemChallenge)
                 .progress(0)
                 .targetAmount(matchingSystemChallenge.getTargetAmount())
                 .status(ChallengeStatus.IN_PROGRESS)
                 .expReward(matchingSystemChallenge.getBaseExp())
                 .rewardCoins(matchingSystemChallenge.getRewardCoins())
                 .assignedAt(now)
                 .build();
        }

        target.setProgress(target.getProgress() + increment);
        int requiredTarget = target.getChallenge().getTargetAmount() > 0 ? target.getChallenge().getTargetAmount() : 1;
        boolean justCompleted = false;

        if (target.getProgress() >= requiredTarget) {
            target.setCompleted(true);
            target.setCompletedAt(now);
            target.setStatus(ChallengeStatus.CAN_CLAIM);
            justCompleted = true;
        }

        target = userDailyChallengeRepository.save(target);

        return DailyChallengeUpdateResponse.builder()
                .challengeId(target.getChallengeId())
                .title(target.getChallenge().getTitle())
                .progress(target.getProgress())
                .target(requiredTarget)
                .isCompleted(justCompleted)
                .expReward(target.getExpReward())
                .rewardCoins(target.getRewardCoins())
                .build();
    }

    @Override
    public UserDailyChallenge assignChallenge(UUID userId) {
        throw new UnsupportedOperationException("Disabled.");
    }

    @Override
    public Map<String, Object> getDailyChallengeStats(UUID userId) {
        List<UserDailyChallenge> todayChallenges = getTodayChallenges(userId);
        
        long completed = todayChallenges.stream().filter(UserDailyChallenge::isCompleted).count();
        int totalExpReward = todayChallenges.stream().mapToInt(UserDailyChallenge::getExpReward).sum();
        int totalCoins = todayChallenges.stream().mapToInt(UserDailyChallenge::getRewardCoins).sum();

        return Map.of(
                "totalChallenges", (long) todayChallenges.size(),
                "completedChallenges", completed,
                "totalExpReward", totalExpReward,
                "totalCoins", totalCoins
        );
    }

    @Override
    @Transactional
    public void completeChallenge(UUID userId, UUID challengeId) {
        // Logic tương tự claim, cần mở rộng range ngày nếu là weekly (nhưng method này ít dùng nếu update progress tự động)
        // ... (Giữ nguyên hoặc update giống trên nếu cần thiết)
    }
}