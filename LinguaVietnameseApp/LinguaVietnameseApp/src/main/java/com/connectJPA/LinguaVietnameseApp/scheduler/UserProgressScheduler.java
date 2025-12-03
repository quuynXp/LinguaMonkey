package com.connectJPA.LinguaVietnameseApp.scheduler;

import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.UserLearningActivityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class UserProgressScheduler {

    private final UserRepository userRepository;
    private final UserLearningActivityService activityService;

    // Chạy vào 02:00 sáng mỗi ngày
    @Scheduled(cron = "0 0 2 * * ?")
    public void runDailyAnalysis() {
        log.info("Starting Daily AI Progress Analysis...");
        
        int page = 0;
        int size = 50;
        Page<User> users;
        
        // Quét từng batch user để tránh overload memory
        do {
            users = userRepository.findAll(PageRequest.of(page, size));
            for (User user : users) {
                // Chỉ phân tích user có hoạt động trong 48h qua để tiết kiệm chi phí AI
                if (user.getLastActiveAt() != null && 
                    user.getLastActiveAt().isAfter(OffsetDateTime.now().minusDays(2))) {
                    try {
                        // Gọi logic thật trong service (kết nối gRPC -> Python -> Gemini)
                        activityService.generateDailyAnalysisForUser(user.getUserId());
                    } catch (Exception e) {
                        log.error("Failed to analyze user {}", user.getUserId(), e);
                    }
                }
            }
            page++;
        } while (users.hasNext());
        
        log.info("Daily AI Progress Analysis Completed.");
    }
}