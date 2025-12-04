package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.enums.BadgeTier;
import com.connectJPA.LinguaVietnameseApp.enums.BadgeType;
import com.connectJPA.LinguaVietnameseApp.enums.CriteriaType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Entity
@Data
@Table(name = "badges")
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class Badge extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "badge_id")
    private UUID badgeId;

    @Column(name = "badge_name", nullable = false)
    private String badgeName;

    @Column(name = "language_code")
    private String languageCode;

    @Column(name = "description")
    private String description;

    @Column(name = "coins")
    private int coins;

    private BadgeType badgeType;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "criteria_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private CriteriaType criteriaType;

    private Integer criteriaValue;

    @Column(name = "criteria_threshold", nullable = false)
    private int criteriaThreshold;

    @Column(name = "tier")
    @Enumerated(EnumType.STRING)
    private BadgeTier tier; // BRONZE, SILVER...

        @Column(name = "screen_route")
    private String screenRoute;
    
    @Column(name = "stack")
    private String stack;
}