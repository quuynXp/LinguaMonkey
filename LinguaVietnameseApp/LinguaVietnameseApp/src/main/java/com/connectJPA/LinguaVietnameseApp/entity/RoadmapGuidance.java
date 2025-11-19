package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.util.List;
import java.util.UUID;

@Data
@Entity
@Table(name = "roadmap_guidance")
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class RoadmapGuidance extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID guidanceId;

    @Column(name = "item_id", nullable = false)
    private UUID itemId;

    @Column(name = "stage")
    private String stage;

    @Column(name = "title")
    private String title;

    @Column(name = "description")
    private String description;

    @Column(name = "order_index")
    private Integer orderIndex;

    @Column(name = "estimated_time")
    private Integer estimatedTime;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "roadmap_guidance_tips", joinColumns = @JoinColumn(name = "guidance_id"))
    @Column(name = "tip")
    private List<String> tips;

}

