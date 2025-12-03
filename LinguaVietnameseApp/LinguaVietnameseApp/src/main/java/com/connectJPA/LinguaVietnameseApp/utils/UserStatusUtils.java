package com.connectJPA.LinguaVietnameseApp.utils;

import java.time.Duration;
import java.time.OffsetDateTime;

public class UserStatusUtils {

    public static boolean isOnline(OffsetDateTime lastActiveAt) {
        if (lastActiveAt == null) return false;
        return lastActiveAt.isAfter(OffsetDateTime.now().minusMinutes(5));
    }

    public static String formatLastActive(OffsetDateTime lastActiveAt) {
        if (lastActiveAt == null) return "Offline";
        
        if (isOnline(lastActiveAt)) {
            return "Online"; // Hoặc trả về null để FE tự xử lý nút xanh
        }

        Duration duration = Duration.between(lastActiveAt, OffsetDateTime.now());
        long minutes = duration.toMinutes();

        if (minutes < 60) {
            return minutes + "m"; // 5m, 10m
        }
        
        long hours = duration.toHours();
        if (hours < 24) {
            return hours + "h"; // 1h, 5h
        }

        long days = duration.toDays();
        // Yêu cầu: kể cả trên 1 tháng vẫn hiện ngày (47d, 100d)
        return days + "d"; 
    }
}