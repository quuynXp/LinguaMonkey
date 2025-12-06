package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.entity.base.BaseEntity;
import com.connectJPA.LinguaVietnameseApp.enums.QuestionType;
import com.connectJPA.LinguaVietnameseApp.enums.SkillType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "lesson_questions")
@SuperBuilder
public class LessonQuestion extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "lesson_question_id")
    private UUID lessonQuestionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id", referencedColumnName = "lesson_id")
    private Lesson lesson; 

    @Column(name = "question", columnDefinition = "TEXT")
    private String question;

    @Column(name = "optiona")
    private String optionA;

    @Column(name = "optionb")
    private String optionB;

    @Column(name = "optionc")
    private String optionC;

    @Column(name = "optiond")
    private String optionD;

    @Enumerated(EnumType.STRING)
    @Column(name = "question_type")
    private QuestionType questionType;

    @Column(name = "language_code")
    private String languageCode;

    @Column(name = "options_json", columnDefinition = "TEXT")
    private String optionsJson;

    @Enumerated(EnumType.STRING)
    private SkillType skillType;

    @Column(name = "media_url", length = 500)
    private String mediaUrl;
    
    @Column(name = "transcript", columnDefinition = "TEXT")
    private String transcript;

    @Column(name = "weight")
    @Builder.Default
    private Integer weight = 1;

    @Column(name = "correct_option", columnDefinition = "TEXT")
    private String correctOption;

    @Column(name = "order_index")
    private Integer orderIndex;

    @Column(name = "explain_answer", columnDefinition = "TEXT")
    private String explainAnswer;
}