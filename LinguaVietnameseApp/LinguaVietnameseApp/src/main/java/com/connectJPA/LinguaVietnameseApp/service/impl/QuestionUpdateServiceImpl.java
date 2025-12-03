package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.entity.LessonQuestion;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LessonQuestionRepository;
import com.connectJPA.LinguaVietnameseApp.service.QuestionUpdateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class QuestionUpdateServiceImpl implements QuestionUpdateService {

    private final LessonQuestionRepository questionRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @Override
    public void updateMediaUrl(LessonQuestion question, String mediaUrl) {
        question.setMediaUrl(mediaUrl);
        questionRepository.save(question);
        log.info(">>> SUCCESS: Updated media for question {}", question.getLessonQuestionId());
    }
}