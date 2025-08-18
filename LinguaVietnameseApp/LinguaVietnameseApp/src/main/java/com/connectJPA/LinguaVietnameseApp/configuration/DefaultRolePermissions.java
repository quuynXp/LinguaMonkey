package com.connectJPA.LinguaVietnameseApp.configuration;


import com.connectJPA.LinguaVietnameseApp.enums.PermissionName;
import com.connectJPA.LinguaVietnameseApp.enums.RoleName;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

@Component
public class DefaultRolePermissions {

    private final Map<RoleName, Set<PermissionName>> defaultPermissions = new EnumMap<>(RoleName.class);

    public DefaultRolePermissions() {
        defaultPermissions.put(RoleName.ADMIN, EnumSet.allOf(PermissionName.class));

        defaultPermissions.put(RoleName.TEACHER, EnumSet.of(
                PermissionName.COURSE_MANAGE,
                PermissionName.LESSON_MANAGE,
                PermissionName.LESSON_REVIEW,
                PermissionName.LESSON_SUBMIT,
                PermissionName.LEADERBOARD_VIEW,
                PermissionName.CHAT_SEND,
                PermissionName.CHAT_READ,
                PermissionName.NOTIFICATION_VIEW,
                PermissionName.VIDEO_CALL_INITIATE,
                PermissionName.AI_ANALYZE_PRONUNCIATION,
                PermissionName.AI_GENERATE_QUESTION,
                PermissionName.AI_GRAMMAR_SUGGESTION
        ));

        defaultPermissions.put(RoleName.STUDENT, EnumSet.of(
                PermissionName.LESSON_SUBMIT,
                PermissionName.LESSON_REVIEW,
                PermissionName.LEADERBOARD_VIEW,
                PermissionName.CHAT_SEND,
                PermissionName.CHAT_READ,
                PermissionName.NOTIFICATION_VIEW,
                PermissionName.VIDEO_CALL_INITIATE,
                PermissionName.AI_ANALYZE_PRONUNCIATION,
                PermissionName.AI_GENERATE_QUESTION,
                PermissionName.AI_GRAMMAR_SUGGESTION,
                PermissionName.LEARNING_PROGRESS_TRACK,
                PermissionName.COUPLE_FEATURE_USE,
                PermissionName.CERTIFICATE_VIEW,
                PermissionName.BADGE_VIEW,
                PermissionName.CHARACTER_3D_CUSTOMIZE
        ));

    }

    public Set<PermissionName> getPermissionsByRole(RoleName role) {
        return defaultPermissions.getOrDefault(role, EnumSet.noneOf(PermissionName.class));
    }

    public Map<RoleName, Set<PermissionName>> getAll() {
        return defaultPermissions;
    }
}

