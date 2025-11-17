package com.connectJPA.LinguaVietnameseApp.scheduler;

import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.entity.LeaderboardEntry;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CoupleRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.DatingInviteRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.FriendshipRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LeaderboardEntryRepository;
// import com.connectJPA.LinguaVietnameseApp.service.LeaderboardService; // (Giả định)
import com.connectJPA.LinguaVietnameseApp.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class CommunityScheduler {

    private final DatingInviteRepository datingInviteRepository;
    private final CoupleRepository coupleRepository;
    private final FriendshipRepository friendshipRepository;
    private final LeaderboardEntryRepository leaderboardEntryRepository;
    private final NotificationService notificationService;
    // private final LeaderboardService leaderboardService; // (GiGả định)

    /**
     * Chạy hàng giờ để dọn dẹp các lời mời đã hết hạn.
     */
    @Scheduled(cron = "0 0 * * * ?") // Mỗi giờ
    @Transactional
    public void expirePendingInvitations() {
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime sevenDaysAgo = now.minusDays(7);

        int expiredDating = datingInviteRepository.expirePendingInvites(now);
        if (expiredDating > 0) log.info("Expired {} pending dating invites.", expiredDating);

        int expiredCouples = coupleRepository.expireExploringCouples(now);
        if (expiredCouples > 0) log.info("Expired {} exploring couples.", expiredCouples);

        int expiredFriends = friendshipRepository.expirePendingFriendships(sevenDaysAgo);
        if (expiredFriends > 0) log.info("Expired {} pending friend requests.", expiredFriends);
    }

    /**
     * Chạy vào nửa đêm Chủ Nhật (rạng sáng T2) để chốt và thông báo Leaderboard.
     */
    @Scheduled(cron = "0 0 0 * * MON") // 00:00 Thứ Hai (chốt tuần cũ)
    @Transactional
    public void finalizeWeeklyLeaderboard() {
        log.info("Finalizing weekly leaderboards...");
        LocalDate snapshotDate = LocalDate.now().minusDays(1); // Ngày Chủ Nhật

        // **Giả định logic nghiệp vụ:**
        // Bạn cần một service (ví dụ: LeaderboardService) để chạy logic
        // tổng kết điểm (EXP) của tuần trước và lưu vào bảng 'leaderboard_entries'
        // với 'snapshot_date' = ngày Chủ Nhật vừa qua.
        // leaderboardService.generateWeeklySnapshot(snapshotDate);

        // Sau khi đã có data, gửi thông báo cho top 3
        Pageable top3 = PageRequest.of(0, 3);
        List<LeaderboardEntry> topUsers = leaderboardEntryRepository.findTopUsers(
                "WEEKLY", // (Tên leaderboard tuần)
                "ALL",      // (Tên tab)
                snapshotDate,
                top3
        ).getContent();

        if (topUsers.isEmpty()) {
            log.warn("No top users found for leaderboard snapshot {}", snapshotDate);
            return;
        }

        int rank = 1;
        for (LeaderboardEntry entry : topUsers) {
            String title = "You're a Top Learner!";
            String content = "Congratulations! You finished #" + (rank++) + " on the weekly leaderboard!";

            if (rank == 2) { // (Đã ++ nên giờ là 2)
                title = "You're #1!";
                content = "Amazing! You finished #1 on the weekly leaderboard! 🏆";
            }

            NotificationRequest request = NotificationRequest.builder()
                    .userId(entry.getUser().getUserId())
                    .title(title)
                    .content(content)
                    .type("LEADERBOARD")
                    .payload("{\"screen\":\"Leaderboard\"}")
                    .build();
            notificationService.createPushNotification(request);
        }
    }
}