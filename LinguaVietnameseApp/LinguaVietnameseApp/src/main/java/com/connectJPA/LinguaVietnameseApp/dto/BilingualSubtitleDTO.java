package com.connectJPA.LinguaVietnameseApp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BilingualSubtitleDTO {
    private UUID subtitleId;

    private double startTime;
    private double endTime;

    private String originalText;
    private String translatedText;
}
