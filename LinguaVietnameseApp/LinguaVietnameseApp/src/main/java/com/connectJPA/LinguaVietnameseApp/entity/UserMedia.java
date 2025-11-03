package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.enums.MediaType;
import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_media")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserMedia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private UUID id;

    private UUID userId;

    @Enumerated(EnumType.STRING)
    private MediaType mediaType;

    private String fileName;

    private String filePath;

    private String fileUrl;

    private OffsetDateTime createdAt;
}
