package com.connectJPA.LinguaVietnameseApp.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BilingualVideoResponse {
    private UUID videoId;
    private String title;
    private String category;
    private String level;
    private String url;
    private OffsetDateTime createdAt;
}
