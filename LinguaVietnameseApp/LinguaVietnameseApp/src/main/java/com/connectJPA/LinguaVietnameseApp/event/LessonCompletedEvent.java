package com.connectJPA.LinguaVietnameseApp.event;

import com.connectJPA.LinguaVietnameseApp.entity.LessonProgress;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class LessonCompletedEvent {

    private final LessonProgress lessonProgress;

    public LessonCompletedEvent(LessonProgress lessonProgress) {
        this.lessonProgress = lessonProgress;
    }
}