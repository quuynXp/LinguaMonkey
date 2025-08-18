package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Entity
@Table(name = "video_subtitles")
@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
public class VideoSubtitle extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID videoSubtitleId;

    private UUID videoId;

    private String languageCode;

    private String subtitleUrl;

}
