package com.connectJPA.LinguaVietnameseApp.service.rateLimit;


import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@RequiredArgsConstructor
public class RateLimitService {

    private final RedisTemplate<String, String> redisTemplate;

    public boolean isAllowed(String userId, String role) {
        int limit = getLimitByRole(role);
        Duration duration = getDurationByRole(role);

        String key = "rate_limit:" + userId;

        Long count = redisTemplate.opsForValue().increment(key);

        if (count == 1) {
            redisTemplate.expire(key, duration);
        }

        return count <= limit;
    }

    public long getRemainingTime(String userId) {
        String key = "rate_limit:" + userId;
        Long ttl = redisTemplate.getExpire(key);
        return ttl != null ? ttl : 0;
    }

    private int getLimitByRole(String role) {
        return switch (role.toLowerCase()) {
            case "admin" -> 100;
            case "staff" -> 50;
            default -> 20;
        };
    }

    private Duration getDurationByRole(String role) {
        // Nếu muốn mỗi vai trò có thời gian reset khác nhau
        return Duration.ofMinutes(1);
    }
}
