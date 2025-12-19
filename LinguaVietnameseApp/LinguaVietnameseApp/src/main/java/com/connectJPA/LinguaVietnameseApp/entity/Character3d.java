package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Entity
@Data
@Table(name = "character3ds")
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class Character3d extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "character3d_id")
    private UUID character3dId;

    @Column(name = "character3d_name", nullable = false, unique = true)
    private String character3dName;

    @Column(name = "description")
    private String description;

    @Column(name = "model_url", columnDefinition = "TEXT")
    private String modelUrl;
}