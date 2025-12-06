package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Data
@Entity
@Table(name = "roadmap_resources")
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class RoadmapResource extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID resourceId;

    @Column(name = "item_id", nullable = false)
    private UUID itemId;

    @Column(name = "type")
    private String type;

    @Column(name = "title")
    private String title;

    @Column(name = "description")
    private String description;

    @Column(name = "url")
    private String url;

    @Column(name = "content_id")
    private UUID contentId;

    @Column(name = "duration")
    private Integer duration;

    private UUID roadmapId;
}
