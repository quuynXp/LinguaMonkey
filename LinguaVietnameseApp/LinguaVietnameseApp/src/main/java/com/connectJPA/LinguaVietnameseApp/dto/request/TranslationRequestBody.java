package com.connectJPA.LinguaVietnameseApp.dto.request;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class TranslationRequestBody {
    private String translatedText;
    private String targetLanguage;
}
