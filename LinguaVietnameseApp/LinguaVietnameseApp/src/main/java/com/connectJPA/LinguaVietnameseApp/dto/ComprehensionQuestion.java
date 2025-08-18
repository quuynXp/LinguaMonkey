package com.connectJPA.LinguaVietnameseApp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ComprehensionQuestion {
    private UUID id;
    private String languageCode;
    private String question;
    private List<String> options;
    private String correctOption;
}
