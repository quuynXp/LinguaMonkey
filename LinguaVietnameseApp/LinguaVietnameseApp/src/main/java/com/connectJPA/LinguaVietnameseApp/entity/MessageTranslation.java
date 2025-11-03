package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Entity
@SuperBuilder
@AllArgsConstructor
@NoArgsConstructor
public class MessageTranslation{
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private UUID chatMessageId;

    private String targetLang;

    private String translatedText;

    private String provider;

    private OffsetDateTime createdAt;
}
