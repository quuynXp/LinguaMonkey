package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.fasterxml.jackson.annotation.JsonIgnore;
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
@Table(name = "roadmap_milestones")
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class RoadmapMilestone extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID milestoneId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "roadmap_id", nullable = false)
    @JsonIgnore
    private Roadmap roadmap;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description")
    private String description;

    @Column(name = "level")
    private Integer level;

    @Column(name = "order_index")
    private Integer orderIndex;


    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "roadmap_milestone_requirements", joinColumns = @JoinColumn(name = "milestone_id"))
    @Column(name = "requirement")
    private List<String> requirements;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "roadmap_milestone_rewards", joinColumns = @JoinColumn(name = "milestone_id"))
    @Column(name = "reward")
    private List<String> rewards;
}

