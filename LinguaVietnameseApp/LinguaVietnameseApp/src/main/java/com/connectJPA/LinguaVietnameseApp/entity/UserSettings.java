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

    // Notification Preferences
    @Column(name = "study_reminders", nullable = false)
    @Builder.Default
    private boolean studyReminders = true;

    @Column(name = "streak_reminders", nullable = false)
    @Builder.Default
    private boolean streakReminders = true;

    @Column(name = "sound_enabled", nullable = false)
    @Builder.Default
    private boolean soundEnabled = true;

    @Column(name = "vibration_enabled", nullable = false)
    @Builder.Default
    private boolean vibrationEnabled = true;

    // Privacy Settings
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