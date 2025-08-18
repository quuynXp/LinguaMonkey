package com.connectJPA.LinguaVietnameseApp.enums;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

public enum PermissionName {

    // === Course ===
    COURSE_MANAGE,         // teacher tạo/sửa/xoá khóa học

    // === Lesson ===
    LESSON_SUBMIT,         // student học & nộp bài
    LESSON_REVIEW,         // teacher hoặc system đánh giá
    LESSON_MANAGE,         // teacher tạo/sửa/xoá bài học

    // === User & Role ===
    USER_MANAGE,           // admin quản lý user
    ROLE_MANAGE,           // admin quản lý role
    PERMISSION_MANAGE,     // admin cấu hình permission

    // === Leaderboard ===
    LEADERBOARD_VIEW,      // mọi role được xem bảng xếp hạng

    // === Chat & Video Call ===
    CHAT_SEND,             // student/teacher gửi tin nhắn
    CHAT_READ,             // xem tin nhắn
    VIDEO_CALL_INITIATE,   // gọi video

    // === Notification ===
    NOTIFICATION_MANAGE,   // gửi thông báo
    NOTIFICATION_VIEW,     // xem thông báo

    // === AI trợ lý học tập ===
    AI_GENERATE_QUESTION,         // sinh câu hỏi
    AI_ANALYZE_PRONUNCIATION,     // đánh giá phát âm
    AI_GRAMMAR_SUGGESTION,        // gợi ý ngữ pháp

    // === Báo cáo, thống kê ===
    STATISTIC_VIEW,
    REPORT_EXPORT,

    // === Hệ thống & tích hợp ===
    SYSTEM_SETTINGS_MANAGE,
    PLATFORM_CHAT_INTEGRATION,
    PLATFORM_VIDEO_INTEGRATION,

    // === Học nhóm / cặp đôi ===
    GROUP_SESSION_MANAGE,
    COUPLE_FEATURE_USE,

    // === Huy hiệu / nhân vật 3D / phần thưởng ===
    BADGE_VIEW,
    CHARACTER_3D_CUSTOMIZE,
    CERTIFICATE_VIEW,

    // === Tiến độ & mục tiêu học ===
    LEARNING_PROGRESS_TRACK,
    USER_GOAL_MANAGE,

    // === Giao dịch / thanh toán ===
    TRANSACTION_MANAGE;

    // ======== Helper Methods ========

    public boolean isSystemPermission() {
        // Các quyền không bắt đầu bằng CREATE/UPDATE/DELETE/VIEW được xem là SYSTEM
        return this.name().startsWith("IMPORT_")
                || this.name().startsWith("EXPORT_")
                || this.name().startsWith("VIEW_PROFIT_REPORT")
                || this.name().startsWith("DELETE_PROFIT_REPORT")
                || this.name().contains("PLATFORM_INTEGRATION");
    }

    public boolean isDeletePermission() {
        return this.name().startsWith("DELETE_");
    }

    public boolean isCrudPermission() {
        return this.name().startsWith("CREATE_") ||
                this.name().startsWith("UPDATE_") ||
                this.name().startsWith("DELETE_") ||
                this.name().startsWith("VIEW_");
    }

    public String getResourceName() {
        // Tách phần sau CREATE_/UPDATE_/DELETE_/VIEW_ thành tên tài nguyên
        String[] parts = this.name().split("_");
        return String.join("_", Arrays.copyOfRange(parts, 1, parts.length));
    }

    public static List<PermissionName> getSystemPermissions() {
        return Arrays.stream(values())
                .filter(PermissionName::isSystemPermission)
                .collect(Collectors.toList());
    }

    public static List<PermissionName> getCrudPermissions() {
        return Arrays.stream(values())
                .filter(PermissionName::isCrudPermission)
                .collect(Collectors.toList());
    }

    public static List<PermissionName> getPermissionsExcludingDelete() {
        return Arrays.stream(values())
                .filter(p -> !p.isDeletePermission())
                .collect(Collectors.toList());
    }
}
