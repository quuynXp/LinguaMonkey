package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Entity
@Data
@Table(name = "user_settings")
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class UserSettings extends BaseEntity {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "sound_enabled", nullable = false)
    @Builder.Default
    private boolean soundEnabled = true;

    @Column(name = "study_reminders", nullable = false)
    @Builder.Default
    private boolean studyReminders = true; // Nhắc nhở chung

    @Column(name = "streak_reminders", nullable = false)
    @Builder.Default
    private boolean streakReminders = true;
    
    @Column(name = "daily_challenge_reminders", nullable = false)
    @Builder.Default
    private boolean dailyChallengeReminders = true;

    @Column(name = "course_reminders", nullable = false)
    @Builder.Default
    private boolean courseReminders = true;

    @Column(name = "couple_reminders", nullable = false)
    @Builder.Default
    private boolean coupleReminders = true;

    @Column(name = "vip_reminders", nullable = false)
    @Builder.Default
    private boolean vipReminders = true;

    @Column(name = "auto_translate", nullable = false)
    @Builder.Default
    private boolean autoTranslate = false;

    @Column(name = "vibration_enabled", nullable = false)
    @Builder.Default
    private boolean vibrationEnabled = true;

    @Column(name = "profile_visibility", nullable = false)
    @Builder.Default
    private boolean profileVisibility = true;

    @Column(name = "progress_sharing", nullable = false)
    @Builder.Default
    private boolean progressSharing = false;

    @Column(name = "search_privacy", nullable = false)
    @Builder.Default
    private boolean searchPrivacy = true;
}