package com.connectJPA.LinguaVietnameseApp.scheduler;

import com.connectJPA.LinguaVietnameseApp.dto.request.NotificationRequest;
import com.connectJPA.LinguaVietnameseApp.entity.LeaderboardEntry;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.CoupleRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.DatingInviteRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.FriendshipRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LeaderboardEntryRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.NotificationService;
import com.connectJPA.LinguaVietnameseApp.utils.NotificationI18nUtil;
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
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class CommunityScheduler {

    private final DatingInviteRepository datingInviteRepository;
    private final CoupleRepository coupleRepository;
    private final FriendshipRepository friendshipRepository;
    private final LeaderboardEntryRepository leaderboardEntryRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;

    @Scheduled(cron = "0 0 * * * ?", zone = "UTC")
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

    @Scheduled(cron = "0 0 0 * * MON", zone = "UTC") 
    @Transactional
    public void finalizeWeeklyLeaderboard() {
        log.info("Finalizing weekly leaderboards...");
        LocalDate snapshotDate = LocalDate.now().minusDays(1);

        Pageable top3 = PageRequest.of(0, 3);
        List<LeaderboardEntry> topUsers = leaderboardEntryRepository.findTopUsers(
                "WEEKLY",
                "ALL",
                snapshotDate,
                top3
        ).getContent();

        if (topUsers.isEmpty()) {
            log.warn("No top users found for leaderboard snapshot {}", snapshotDate);
            return;
        }

        List<User> usersWithLang = userRepository.findAllById(
                topUsers.stream().map(entry -> entry.getUser().getUserId()).collect(Collectors.toList())
        );
        
        int rank = 1;
        for (LeaderboardEntry entry : topUsers) {
            String langCode = usersWithLang.stream()
                    .filter(u -> u.getUserId().equals(entry.getUser().getUserId()))
                    .findFirst()
                    .map(User::getNativeLanguageCode)
                    .orElse("en");

            String notificationKey = (rank == 1) ? "LEADERBOARD_RANK1" : "LEADERBOARD_OTHER";
            String[] message = NotificationI18nUtil.getLocalizedMessage(notificationKey, langCode);

            String title;
            String content;
            if (rank == 1) {
                title = message[0];
                content = message[1];
            } else {
                title = message[0];
                content = String.format(message[1], rank);
            }
            
            NotificationRequest request = NotificationRequest.builder()
                    .userId(entry.getUser().getUserId())
                    .title(title)
                    .content(content)
                    .type("LEADERBOARD")
                    .payload("{\"screen\":\"Progress\"}")
                    .build();
            notificationService.createPushNotification(request);
            rank++;
        }
    }
}