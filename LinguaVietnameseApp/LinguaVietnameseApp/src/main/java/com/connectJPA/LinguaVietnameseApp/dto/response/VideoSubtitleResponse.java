package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class VideoSubtitleResponse {
    private UUID videoSubtitleId;
    private UUID videoId;
    private String languageCode;
    private String subtitleUrl;
    private OffsetDateTime createdAt;
}
