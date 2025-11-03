package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.LanguageRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LanguageResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Language;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
import com.connectJPA.LinguaVietnameseApp.mapper.LanguageMapper;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LanguageRepository;
import com.connectJPA.LinguaVietnameseApp.service.LanguageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class LanguageServiceImpl implements LanguageService {
    private final LanguageRepository languageRepository;
    private final LanguageMapper languageMapper;

    @Override
    public Page<LanguageResponse> getAllLanguages(String languageCode, String languageName, Pageable pageable) {
        try {
            if (pageable == null) {
                throw new AppException(ErrorCode.INVALID_PAGEABLE);
            }
            Page<Language> languages = languageRepository.findByLanguageCodeAndLanguageNameAndIsDeletedFalse(languageCode, languageName, pageable);
            return languages.map(languageMapper::toResponse);
        } catch (Exception e) {
            log.error("Error while fetching all languages: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public LanguageResponse getLanguageByLanguageCode(String languageCode) {
        try {
            if (languageCode == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            Language language = languageRepository.findByLanguageCodeAndIsDeletedFalse(languageCode)
                    .orElseThrow(() -> new AppException(ErrorCode.LANGUAGE_NOT_FOUND));
            return languageMapper.toResponse(language);
        } catch (Exception e) {
            log.error("Error while fetching language by languageCode {}: {}", languageCode, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public LanguageResponse createLanguage(LanguageRequest request) {
        try {
            if (request == null) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            Language language = languageMapper.toEntity(request);
            language = languageRepository.save(language);
            return languageMapper.toResponse(language);
        } catch (Exception e) {
            log.error("Error while creating language: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public LanguageResponse updateLanguage(String languageCode, LanguageRequest request) {
        try {
            if (languageCode == null || request == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            Language language = languageRepository.findByLanguageCodeAndIsDeletedFalse(languageCode)
                    .orElseThrow(() -> new AppException(ErrorCode.LANGUAGE_NOT_FOUND));
            languageMapper.updateEntityFromRequest(request, language);
            language = languageRepository.save(language);
            return languageMapper.toResponse(language);
        } catch (Exception e) {
            log.error("Error while updating language languageCode {}: {}", languageCode, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    public void deleteLanguage(String languageCode) {
        try {
            if (languageCode ==  null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            Language language = languageRepository.findByLanguageCodeAndIsDeletedFalse(languageCode)
                    .orElseThrow(() -> new AppException(ErrorCode.LANGUAGE_NOT_FOUND));
            languageRepository.softDeleteByLanguageCode(languageCode);
        } catch (Exception e) {
            log.error("Error while deleting language ID {}: {}", languageCode, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }
}