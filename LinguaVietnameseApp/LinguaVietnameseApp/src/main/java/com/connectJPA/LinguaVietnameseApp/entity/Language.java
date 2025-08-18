package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "languages")
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class Language extends BaseEntity {
    @Id
    @Column(name = "language_code")
    private String languageCode;

    @Column(name = "language_name", nullable = false, unique = true)
    private String languageName;

    @Column(name = "description")
    private String description;
}
