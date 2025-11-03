package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.BasicLessonRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.BasicLessonResponse;
import com.connectJPA.LinguaVietnameseApp.entity.BasicLesson;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.BasicLessonRepository;
import com.connectJPA.LinguaVietnameseApp.service.BasicLessonService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BasicLessonServiceImpl implements BasicLessonService {

    private final BasicLessonRepository repository;

    @Override
    public BasicLessonResponse create(BasicLessonRequest request) {
        if (request.getLanguageCode() == null || request.getLessonType() == null)
            throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);

        BasicLesson entity = BasicLesson.builder()
                .languageCode(request.getLanguageCode())
                .lessonType(request.getLessonType())
                .symbol(request.getSymbol())
                .romanization(request.getRomanization())
                .meaning(request.getMeaning())
                .pronunciationAudioUrl(request.getPronunciationAudioUrl())
                .videoUrl(request.getVideoUrl())
                .imageUrl(request.getImageUrl())
                .exampleSentence(request.getExampleSentence())
                .exampleTranslation(request.getExampleTranslation())
                .build();
        repository.save(entity);
        return new BasicLessonResponse(entity);
    }

    @Override
    public BasicLessonResponse getById(UUID id) {
        BasicLesson entity = repository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));
        return new BasicLessonResponse(entity);
    }

    @Override
    public Page<BasicLessonResponse> getByLanguageAndType(String languageCode, String lessonType, Pageable pageable) {
        return repository.findByLanguageCodeAndLessonType(languageCode, lessonType, pageable)
                .map(BasicLessonResponse::new);
    }
}
