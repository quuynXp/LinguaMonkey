package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
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

    @Column(name = "badge_name", nullable = false, unique = true)
    private String badgeName;

    @Column(name = "description")
    private String description;

    @Column(name = "image_url")
    private String imageUrl;

}
