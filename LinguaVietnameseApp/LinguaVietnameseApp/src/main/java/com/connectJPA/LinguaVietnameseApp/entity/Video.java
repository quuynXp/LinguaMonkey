package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.enums.DifficultyLevel;
import com.connectJPA.LinguaVietnameseApp.enums.VideoType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Entity
@Table(name = "videos")
@Data
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class Video extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID videoId;

    private String title;

    private String videoUrl;

    @Enumerated(EnumType.STRING)
    private VideoType type;

    private String originalSubtitleUrl;

    private UUID lessonId;

    private String language;

    private double averageRating;

    private long totalViews;

    @Enumerated(EnumType.STRING)
    private DifficultyLevel level;

}
