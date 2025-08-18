package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
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

    private String videoUrl;

    private String originalSubtitleUrl;

    private UUID lessonId;
}
