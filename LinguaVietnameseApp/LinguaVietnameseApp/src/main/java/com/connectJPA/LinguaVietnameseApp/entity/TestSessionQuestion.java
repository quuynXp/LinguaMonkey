package com.connectJPA.LinguaVietnameseApp.entity;

import com.connectJPA.LinguaVietnameseApp.configuration.JsonbConverter;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.UuidGenerator;
import java.util.UUID;

@Data
@Entity
@Table(name = "test_session_questions")
public class TestSessionQuestion {
    @Id
    @UuidGenerator
    @Column(name = "question_id")
    private UUID questionId;

    @Column(name = "test_session_id", nullable = false)
    private UUID testSessionId;

    @Column(name = "question_text", nullable = false, columnDefinition = "TEXT")
    private String questionText;

    // Dùng converter để xử lý JSONB
    @Column(name = "options_json", columnDefinition = "jsonb")
    @Convert(converter = JsonbConverter.class)
    private Object optionsJson; // Sẽ là List<String>

    @Column(name = "correct_answer_index", nullable = false)
    private Integer correctAnswerIndex;

    @Column(name = "explanation", columnDefinition = "TEXT")
    private String explanation;

    @Column(name = "skill_type")
    private String skillType;

    @Column(name = "user_answer_index")
    private Integer userAnswerIndex;

    @Column(name = "is_correct")
    private Boolean isCorrect;

    @Column(name = "order_index", nullable = false)
    private Integer orderIndex;

    // Liên kết
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "test_session_id", insertable = false, updatable = false)
    private TestSession testSession;
}