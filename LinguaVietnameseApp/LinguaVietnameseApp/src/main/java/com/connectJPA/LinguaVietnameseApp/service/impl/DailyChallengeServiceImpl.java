package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.response.DailyChallengeUpdateResponse;
import com.connectJPA.LinguaVietnameseApp.entity.DailyChallenge;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.entity.UserDailyChallenge;
import com.connectJPA.LinguaVietnameseApp.entity.id.UserDailyChallengeId;
import com.connectJPA.LinguaVietnameseApp.enums.ChallengeStatus;
import com.connectJPA.LinguaVietnameseApp.enums.ChallengeType;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.DailyChallengeRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserDailyChallengeRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.DailyChallengeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
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
        OffsetDateTime startOfDay = now.truncatedTo(ChronoUnit.DAYS);
        OffsetDateTime endOfDay = startOfDay.plusDays(1).minusNanos(1);

        // 1. Lấy TOÀN BỘ danh sách thử thách hệ thống (Source of Truth)
        // Giả sử logic là lấy tất cả active, hoặc bạn có thể filter theo ngày nếu logic DB của bạn có phân ngày cho challenge gốc
        List<DailyChallenge> allSystemChallenges = dailyChallengeRepository.findByIsDeletedFalse(); 

        // 2. Lấy tiến độ của User trong ngày hôm nay
        List<UserDailyChallenge> userProgressList = userDailyChallengeRepository.findChallengesForToday(userId, startOfDay, endOfDay);
        
        // Map để tra cứu nhanh tiến độ: ChallengeID -> UserDailyChallenge
        Map<UUID, UserDailyChallenge> progressMap = userProgressList.stream()
                .collect(Collectors.toMap(udc -> udc.getChallenge().getId(), Function.identity()));

        List<UserDailyChallenge> result = new ArrayList<>();

        // 3. MERGE: Duyệt qua tất cả Challenge hệ thống
        for (DailyChallenge sysChallenge : allSystemChallenges) {
            if (progressMap.containsKey(sysChallenge.getId())) {
                // User đã có tương tác -> Dùng record thực tế từ DB
                result.add(progressMap.get(sysChallenge.getId()));
            } else {
                // User chưa chạm vào -> Tạo record "ảo" (Transient) để hiển thị
                // KHÔNG save vào DB lúc này, chỉ hiển thị UI
                UserDailyChallenge virtualRecord = UserDailyChallenge.builder()
                        .id(UserDailyChallengeId.builder()
                                .userId(userId)
                                .challengeId(sysChallenge.getId())
                                .assignedDate(now)
                                .build())
                        .challenge(sysChallenge)
                        .progress(0)
                        .targetAmount(sysChallenge.getTargetAmount())
                        .isCompleted(false)
                        .status(ChallengeStatus.IN_PROGRESS) // Mặc định là đang làm (tiến độ 0%)
                        .expReward(sysChallenge.getBaseExp())
                        .rewardCoins(sysChallenge.getRewardCoins())
                        .build();
                result.add(virtualRecord);
            }
        }

        // 4. SORT: CAN_CLAIM (1) -> IN_PROGRESS (2) -> CLAIMED/Completed (3)
        return result.stream()
                .sorted(Comparator.comparing((UserDailyChallenge c) -> {
                    if (c.getStatus() == ChallengeStatus.CAN_CLAIM) return 1;
                    // Chưa xong (kể cả ảo progress=0) nằm ở giữa
                    if (c.getStatus() == ChallengeStatus.IN_PROGRESS && !c.isCompleted()) return 2;
                    // Đã xong hoặc đã nhận thưởng -> Chìm xuống đáy
                    return 3; 
                }))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void claimReward(UUID userId, UUID challengeId) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime startOfDay = now.truncatedTo(ChronoUnit.DAYS);
        OffsetDateTime endOfDay = startOfDay.plusDays(1).minusNanos(1);

        // Tìm record tiến độ. Nếu null nghĩa là user chưa làm gì cả -> lỗi logic hoặc hack
        UserDailyChallenge challenge = userDailyChallengeRepository
                .findById(UserDailyChallengeId.builder()
                        .userId(userId)
                        .challengeId(challengeId)
                        .assignedDate(now)
                        .build())
                .orElse(null);

        // Fallback tìm lỏng lẻo hơn
        if (challenge == null) {
            challenge = userDailyChallengeRepository.findClaimableChallenge(userId, challengeId, startOfDay, endOfDay)
                    .orElseThrow(() -> new RuntimeException("Nhiệm vụ chưa hoàn thành!"));
        }

        if (challenge.getStatus() == ChallengeStatus.CLAIMED) {
            return; 
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
        // Logic này cần tìm record trong DB, nếu chưa có thì phải TẠO MỚI (Insert) từ bảng DailyChallenge gốc
        
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime startOfDay = now.truncatedTo(ChronoUnit.DAYS);
        OffsetDateTime endOfDay = startOfDay.plusDays(1).minusNanos(1);

        // 1. Tìm challenge tương ứng loại này trong list challenge hệ thống (Active)
        // (Đây là logic đơn giản hóa, thực tế bạn nên query DB để lấy đúng challenge cần update)
        List<UserDailyChallenge> todayChallenges = userDailyChallengeRepository.findChallengesForToday(userId, startOfDay, endOfDay);
        
        UserDailyChallenge target = todayChallenges.stream()
            .filter(udc -> !udc.isCompleted() && udc.getChallenge().getChallengeType() == challengeType)
            .findFirst()
            .orElse(null);

        // Nếu chưa có trong UserDailyChallenge nhưng có trong hệ thống -> Insert mới
        if (target == null) {
             List<DailyChallenge> systemChallenges = dailyChallengeRepository.findByIsDeletedFalse();
             DailyChallenge matchingSystemChallenge = systemChallenges.stream()
                 .filter(dc -> dc.getChallengeType() == challengeType)
                 .findFirst()
                 .orElse(null);
             
             if (matchingSystemChallenge == null) return null; // Không có challenge nào loại này hôm nay

             // Tạo mới record
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

        // Update logic
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
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime startOfDay = now.truncatedTo(ChronoUnit.DAYS);
        OffsetDateTime endOfDay = startOfDay.plusDays(1).minusNanos(1);

        List<UserDailyChallenge> challenges = userDailyChallengeRepository
                .findChallengeForToday(userId, challengeId, startOfDay, endOfDay);

        if (challenges.isEmpty()) return;

        UserDailyChallenge challengeToComplete = challenges.stream()
                .filter(c -> !c.isCompleted())
                .findFirst()
                .orElse(null);

        if (challengeToComplete == null) return;

        challengeToComplete.setCompleted(true);
        challengeToComplete.setCompletedAt(OffsetDateTime.now(ZoneOffset.UTC));
        userDailyChallengeRepository.save(challengeToComplete);

        User user = userRepository.findById(userId).orElseThrow();
        user.setExp(user.getExp() + challengeToComplete.getExpReward());
        user.setCoins(user.getCoins() + challengeToComplete.getRewardCoins()); // Added Coins Logic
        userRepository.save(user);
    }
}