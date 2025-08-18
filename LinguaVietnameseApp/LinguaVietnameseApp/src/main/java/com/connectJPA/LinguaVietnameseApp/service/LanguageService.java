package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.LanguageRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LanguageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface LanguageService {
    Page<LanguageResponse> getAllLanguages(String languageCode, String languageName, Pageable pageable);
    LanguageResponse getLanguageByLanguageCode(String languageCode);
    LanguageResponse createLanguage(LanguageRequest request);
    LanguageResponse updateLanguage(String languageCode, LanguageRequest request);
    void deleteLanguage(String languageCode);
}