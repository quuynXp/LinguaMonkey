// package com.connectJPA.LinguaVietnameseApp.scheduler;

// import lombok.RequiredArgsConstructor;
// import lombok.extern.slf4j.Slf4j;
// import org.springframework.data.redis.core.RedisTemplate;
// import org.springframework.messaging.simp.SimpMessagingTemplate;
// import org.springframework.scheduling.annotation.Scheduled;
// import org.springframework.stereotype.Component;

// import java.util.Set;

// @Component
// @Slf4j
// @RequiredArgsConstructor
// public class OnlineStatusScheduler {

//     private final RedisTemplate<String, String> redisTemplate;
//     private final SimpMessagingTemplate messagingTemplate;

//     private static final String ONLINE_USER_KEY_PATTERN = "user:online:*";

//     // Chạy mỗi 5 giây
//     @Scheduled(fixedRate = 5000)
//     public void broadcastTotalOnlineUsers() {
//         try {
//             // Lưu ý: keys() có thể chậm nếu Redis quá lớn (hàng triệu keys). 
//             // Với quy mô vừa phải, cách này ổn. Quy mô lớn nên dùng HyperLogLog hoặc AtomicLong.
//             Set<String> keys = redisTemplate.keys(ONLINE_USER_KEY_PATTERN);
//             int count = keys != null ? keys.size() : 0;

//             // Broadcast con số này tới tất cả client
//             messagingTemplate.convertAndSend("/topic/public/online-count", count);
            
//         } catch (Exception e) {
//             log.error("Error broadcasting online count", e);
//         }
//     }
// }