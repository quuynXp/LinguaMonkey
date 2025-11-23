package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.enums.*;
// import com.connectJPA.LinguaVietnameseApp.service.elasticsearch.listener.ElasticsearchEntityListener;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;
// import org.springframework.data.elasticsearch.annotations.Document;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
// @Document(indexName = "users")
@SuperBuilder
@FieldDefaults(level = AccessLevel.PRIVATE)
// @EntityListeners(ElasticsearchEntityListener.class)
@Entity
@Table(name = "users")
@AllArgsConstructor
@NoArgsConstructor
public class User extends BaseEntity {

    private static final long ONLINE_THRESHOLD_MINUTES = 5;

    @org.springframework.data.annotation.Id
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

    @Column(name = "bio", columnDefinition = "text")
    private String bio;

    @Column(name = "phone", unique = true)
    private String phone;

    @Column(name = "avatar_url")
    private String avatarUrl;

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

    @Enumerated(EnumType.STRING)
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

    @Transient
    public boolean isOnline() {
        if (this.lastActiveAt == null) {
            return false;
        }
        OffsetDateTime onlineThreshold = OffsetDateTime.now().minusMinutes(ONLINE_THRESHOLD_MINUTES);
        return this.lastActiveAt.isAfter(onlineThreshold);
    }
}