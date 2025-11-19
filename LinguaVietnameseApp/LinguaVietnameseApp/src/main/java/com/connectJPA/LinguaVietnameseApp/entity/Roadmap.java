package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.enums.RoadmapType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "roadmaps")
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class Roadmap extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "roadmap_id")
    private UUID roadmapId;

    @Column(name = "language_code", nullable = false)
    private String languageCode;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description")
    private String description;

    @Column(name = "total_items")
    private Integer totalItems;

    @Column(name = "type")
    private String type; // language, skill, certificate

    @OneToMany(mappedBy = "roadmap", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<RoadmapItem> items;

    @OneToMany(mappedBy = "roadmap", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<RoadmapMilestone> milestones;

}

