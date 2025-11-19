package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "roadmap_items")
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class RoadmapItem extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID itemId;

    @Column(name = "roadmap_id", nullable = false)
    private UUID roadmapId;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description")
    private String description;

    @Column(name = "type")
    private String type;

    @Column(name = "level")
    private Integer level;

    @Column(name = "estimated_time")
    private Integer estimatedTime;

    @Column(name = "order_index")
    private Integer orderIndex;

    @Column(name = "category")
    private String category;

    @Column(name = "difficulty")
    private String difficulty;

    @Column(name = "exp_reward")
    private Integer expReward;

    @Column(name = "content_id")
    private UUID contentId;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "roadmap_item_skills", joinColumns = @JoinColumn(name = "item_id"))
    @Column(name = "skill")
    private List<String> skills;

}

