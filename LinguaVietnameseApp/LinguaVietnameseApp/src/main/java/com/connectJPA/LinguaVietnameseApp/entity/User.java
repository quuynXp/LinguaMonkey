package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.converter.ProficiencyLevelConverter;
import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.enums.*;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@SuperBuilder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "users")
@AllArgsConstructor
@NoArgsConstructor
public class User extends BaseEntity {

    private static final long ONLINE_THRESHOLD_MINUTES = 5;
    private static final int DEFAULT_MIN_LEARNING_DURATION_MINUTES = 15;

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "email", unique = true, nullable = false)
    private String email;

    @Column(name = "password")
    private String password;

    @Column(name = "fullname")
    private String fullname;

    @Column(name = "nickname")
    private String nickname;

    // FIX: Thêm cascade = CascadeType.ALL để khi lưu User sẽ tự động lưu UserSettings
    @OneToOne(mappedBy = "user", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private UserSettings userSettings;

    @Column(name = "bio", columnDefinition = "text")
    private String bio;

    @Column(name = "phone", unique = true)
    private String phone;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(name = "allow_stranger_chat")
    @Builder.Default
    private boolean allowStrangerChat = true;

    @Column(name = "character3d_id")
    private UUID character3dId;

    @Column(name = "native_language_code")
    private String nativeLanguageCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "country")
    private Country country;

    @Enumerated(EnumType.STRING)
    @Column(name = "age_range")
    private AgeRange ageRange;

    @Column(name = "day_of_birth")
    private LocalDate dayOfBirth;

    @Convert(converter = ProficiencyLevelConverter.class)
    @Column(name = "proficiency")
    private ProficiencyLevel proficiency;

    @Column(name = "level", nullable = false)
    @Builder.Default
    private int level = 1;

    @Column(name = "exp", nullable = false)
    @Builder.Default
    private int exp = 0;

    @Column(name = "streak", nullable = false)
    @Builder.Default
    private int streak = 0;

    @Column(name = "last_active_at")
    private OffsetDateTime lastActiveAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "learning_pace")
    private LearningPace learningPace;

    @Column(name = "has_finished_setup", nullable = false)
    @Builder.Default
    private boolean hasFinishedSetup = false;

    @Column(name = "has_done_placement_test", nullable = false)
    @Builder.Default
    private boolean hasDonePlacementTest = false;

    @Column(name = "last_daily_welcome_at")
    private OffsetDateTime lastDailyWelcomeAt;
    
    @Column(name = "min_learning_duration_minutes", nullable = false)
    @Builder.Default
    private int minLearningDurationMinutes = DEFAULT_MIN_LEARNING_DURATION_MINUTES;

    @Column(name = "last_streak_check_date")
    private LocalDate lastStreakCheckDate;

    @Column(name = "coins", nullable = false)
    @Builder.Default
    private int coins = 0;

    @Column(name = "gender")
    @Builder.Default
    private String gender = "any";

    @Column(name = "vip_expiration_date")
    private OffsetDateTime vipExpirationDate;

    // --- New Fields for AI Progress Assessment ---
    @Column(name = "latest_improvement_suggestion", columnDefinition = "text")
    private String latestImprovementSuggestion;

    @Column(name = "last_suggestion_generated_at")
    private OffsetDateTime lastSuggestionGeneratedAt;

    @Transient
    public boolean isOnline() {
        if (this.lastActiveAt == null) {
            return false;
        }
        OffsetDateTime onlineThreshold = OffsetDateTime.now().minusMinutes(ONLINE_THRESHOLD_MINUTES);
        return this.lastActiveAt.isAfter(onlineThreshold);
    }

    @Transient
    public boolean isVip() {
        return vipExpirationDate != null && vipExpirationDate.isAfter(OffsetDateTime.now());
    }

    public void setUserSettings(UserSettings userSettings) {
        this.userSettings = userSettings;
        if (userSettings != null) {
            userSettings.setUser(this);
        }
    }
}