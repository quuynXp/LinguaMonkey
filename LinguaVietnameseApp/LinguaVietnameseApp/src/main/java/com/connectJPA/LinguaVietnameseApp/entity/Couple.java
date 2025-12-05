package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.enums.CoupleStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "couples")
@Data
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class Couple extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private java.util.UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user1_id", nullable = false)
    private User user1;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user2_id", nullable = false)
    private User user2;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private CoupleStatus status = CoupleStatus.EXPLORING;

    @Column(name = "start_date")
    private LocalDate startDate;   // ngày quen nhau

    @Column(name = "anniversary")
    private LocalDate anniversary; // ngày kỷ niệm

    private OffsetDateTime exploringStart;
    private OffsetDateTime exploringExpiresAt;
    private OffsetDateTime coupleStartDate;
    
    @Builder.Default
    private int couple_score = 0;

    @Column(name = "last_interaction_at")
    private OffsetDateTime lastInteractionAt; // FIELD BỊ THIẾU

    @Column(name = "shared_avatar_url")
    private String sharedAvatarUrl; 

    @Column(name = "note", columnDefinition = "TEXT")
    private String note; 
}