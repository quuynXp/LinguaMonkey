package com.connectJPA.LinguaVietnameseApp.dto.response;

import com.connectJPA.LinguaVietnameseApp.entity.BasicLesson;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BasicLessonResponse {
    UUID id;
    String languageCode;
    String lessonType;
    String symbol;
    String romanization;
    String meaning;
    String pronunciationAudioUrl;
    String videoUrl;
    String imageUrl;
    String exampleSentence;
    String exampleTranslation;

    public BasicLessonResponse(BasicLesson entity) {
        this.id = entity.getId();
        this.languageCode = entity.getLanguageCode();
        this.lessonType = entity.getLessonType();
        this.symbol = entity.getSymbol();
        this.romanization = entity.getRomanization();
        this.meaning = entity.getMeaning();
        this.pronunciationAudioUrl = entity.getPronunciationAudioUrl();
        this.videoUrl = entity.getVideoUrl();
        this.imageUrl = entity.getImageUrl();
        this.exampleSentence = entity.getExampleSentence();
        this.exampleTranslation = entity.getExampleTranslation();
    }
}
