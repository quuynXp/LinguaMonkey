package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Entity
@Table(name = "basic_lessons")
@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class BasicLesson extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "basic_lesson_id")
    private UUID id;

    @Column(name = "language_code", nullable = false)
    private String languageCode; // ví dụ: "en", "zh", "vi"

    @Column(name = "symbol", nullable = false)
    private String symbol; // ký tự hoặc âm vị (ví dụ: [ʃ], [ɑ:], “我”, “你”)

    @Column(name = "romanization")
    private String romanization; // pinyin hoặc cách đọc

    @Column(name = "meaning")
    private String meaning; // nghĩa tiếng Việt

    @Column(name = "pronunciation_audio_url")
    private String pronunciationAudioUrl; // audio hướng dẫn phát âm

    @Column(name = "video_url")
    private String videoUrl; // video hướng dẫn viết/đọc/phát âm

    @Column(name = "image_url")
    private String imageUrl; // hình minh họa

    @Column(name = "example_sentence")
    private String exampleSentence; // ví dụ dùng từ / ký tự này

    @Column(name = "example_translation")
    private String exampleTranslation; // dịch ví dụ

    @Column(name = "lesson_type", nullable = false)
    private String lessonType; // “IPA”, “HANZI”, “KANA”, “KOREAN_BASIC”...
}
