package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BasicLessonRequest {

    @NotBlank
    String languageCode; // en, zh, vi

    @NotBlank
    String lessonType; // IPA, HANZI, VIET_PHONETIC,...

    @NotBlank
    String symbol; // ký tự hoặc âm vị (vd: [ʃ], 我, a)

    String romanization; // pinyin hoặc cách đọc
    String meaning; // nghĩa tiếng Việt
    String pronunciationAudioUrl;
    String videoUrl;
    String imageUrl;
    String exampleSentence;
    String exampleTranslation;
}
