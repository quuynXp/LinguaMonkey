package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.entity.LessonQuestion;

public interface QuestionUpdateService {

    void updateMediaUrl(LessonQuestion question, String mediaUrl);

}
