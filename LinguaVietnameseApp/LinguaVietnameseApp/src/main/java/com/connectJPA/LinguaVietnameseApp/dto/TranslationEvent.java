package com.connectJPA.LinguaVietnameseApp.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class TranslationEvent {
    private UUID messageId;
    private String targetLang;
    private String translatedText;
    private String provider;
}
