package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.enums.*;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.Set;
import java.util.UUID;

@Data
@SuperBuilder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "users")
@AllArgsConstructor
@NoArgsConstructor
public class User extends BaseEntity {
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
    private AgeRange ageRange;

    @Enumerated(EnumType.STRING)
    private ProficiencyLevel proficiency;

    @Column(name = "level", nullable = false)
    private int level = 1;

    @Column(name = "exp", nullable = false)
    private int exp = 0;

    @Column(name = "streak", nullable = false)
    private int streak = 0;

    @Column(name = "last_active_at")
    private OffsetDateTime lastActiveAt;

    @Enumerated(EnumType.STRING)
    private LearningPlace learningPace;

}
