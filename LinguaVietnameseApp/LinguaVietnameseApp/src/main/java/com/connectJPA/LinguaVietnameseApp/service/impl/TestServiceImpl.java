package com.connectJPA.LinguaVietnameseApp.service.impl;



import com.connectJPA.LinguaVietnameseApp.dto.request.TestSubmissionRequest;

import com.connectJPA.LinguaVietnameseApp.dto.response.TestConfigResponse;

import com.connectJPA.LinguaVietnameseApp.dto.response.TestResultResponse;

import com.connectJPA.LinguaVietnameseApp.dto.response.TestSessionResponse;

import com.connectJPA.LinguaVietnameseApp.entity.*; // Import các entity mới

import com.connectJPA.LinguaVietnameseApp.enums.ProficiencyLevel;

import com.connectJPA.LinguaVietnameseApp.exception.AppException;

import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;

import com.connectJPA.LinguaVietnameseApp.grpc.GrpcClientService;

import com.connectJPA.LinguaVietnameseApp.repository.jpa.*; // Import các repo mới

import com.connectJPA.LinguaVietnameseApp.service.TestService;

import learning.QuizGenerationResponse;

import learning.QuizQuestionProto;

import lombok.RequiredArgsConstructor;

import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;

import org.springframework.transaction.annotation.Transactional;



import java.time.OffsetDateTime;

import java.util.ArrayList;

import java.util.List;

import java.util.UUID;

import java.util.concurrent.CompletableFuture;

import java.util.stream.Collectors;



@Service

@RequiredArgsConstructor

@Slf4j

public class TestServiceImpl implements TestService {

    private final GrpcClientService grpcClientService;

    private final ProficiencyTestConfigRepository testConfigRepository;

    private final TestSessionRepository testSessionRepository;

    private final TestSessionQuestionRepository testQuestionRepository;

    private final UserRepository userRepository; // Dùng để cập nhật profile user



    /**

     * Lấy danh sách các bài test có sẵn

     */

    @Override

    public List<TestConfigResponse> getAvailableTests(String languageCode) {

        return testConfigRepository.findAllByLanguageCodeAndIsActiveTrue(languageCode)

                .stream()

                .map(TestConfigResponse::fromEntity)

                .collect(Collectors.toList());

    }



    /**

     * Bắt đầu một bài test: Gọi AI -> Tạo Session -> Lưu câu hỏi

     */

    @Override

    @Transactional

    public TestSessionResponse startTest(UUID testConfigId, UUID userId, String token) {

        ProficiencyTestConfig config = testConfigRepository.findById(testConfigId)

                .orElseThrow(() -> new AppException(ErrorCode.ITEM_NOT_FOUND));



        log.info("Starting test for user {} with config {}. Calling AI...", userId, testConfigId);



        // 1. Gọi Python (gRPC) để sinh câu hỏi

        CompletableFuture<QuizGenerationResponse> futureResponse = grpcClientService.generateLanguageQuiz(

                token,

                userId.toString(),

                config.getNumQuestions(),

                "solo", // Mode

                config.getAiTopic() // Đây là chìa khóa: "placement_test", "grammar_b1", v.v.

        );



        QuizGenerationResponse aiResponse = futureResponse.join(); // Chờ kết quả

        if (aiResponse == null || aiResponse.getQuestionsCount() == 0) {

            log.error("AI failed to generate questions. Response: {}", aiResponse);

            throw new AppException(ErrorCode.AI_PROCESSING_FAILED);

        }

        log.info("AI returned {} questions.", aiResponse.getQuestionsCount());



        // 2. Tạo Session

        TestSession session = new TestSession();

        session.setUserId(userId);

        session.setTestConfigId(testConfigId);

        session.setStatus("PENDING");

        TestSession savedSession = testSessionRepository.save(session);



        // 3. Lưu các câu hỏi từ AI vào DB

        List<TestSessionQuestion> questionsToSave = new ArrayList<>();

        int order = 0;

        for (QuizQuestionProto aiQuestion : aiResponse.getQuestionsList()) {

            TestSessionQuestion q = new TestSessionQuestion();

            q.setTestSessionId(savedSession.getTestSessionId());

            q.setQuestionText(aiQuestion.getQuestionText());



            // ============ FIX LỖI JSONB/VARCHAR ============

            // Chuyển đổi List<String> thành chuỗi JSON array (ví dụ: ["go", "went", "gone"])

            List<String> quotedOptions = aiQuestion.getOptionsList().stream()

                    .map(option -> "\"" + option.replace("\"", "\\\"") + "\"") // Quote và escape nội dung

                    .collect(Collectors.toList());

            String optionsJsonString = "[" + String.join(",", quotedOptions) + "]";



            q.setOptionsJson(optionsJsonString);

            // ============ KẾT THÚC FIX ============



            q.setCorrectAnswerIndex(aiQuestion.getCorrectAnswerIndex());

            q.setExplanation(aiQuestion.getExplanation());

            q.setSkillType(aiQuestion.getSkillType());

            q.setOrderIndex(order++);

            questionsToSave.add(q);

        }

        List<TestSessionQuestion> savedQuestions = testQuestionRepository.saveAll(questionsToSave);



        // 4. Trả về session_id và bộ câu hỏi (không có đáp án)

        List<TestSessionResponse.QuestionDto> questionsForResponse = savedQuestions.stream()

                .map(TestSessionResponse.QuestionDto::fromEntity)

                .collect(Collectors.toList());



        return new TestSessionResponse(savedSession.getTestSessionId(), questionsForResponse);

    }



    /**

     * Nộp bài, chấm điểm, và trả về kết quả

     */

    @Transactional

    @Override

    public TestResultResponse submitTest(UUID sessionId, UUID userId, TestSubmissionRequest submission) {

        TestSession session = testSessionRepository.findByTestSessionIdAndUserId(sessionId, userId)

                .orElseThrow(() -> new AppException(ErrorCode.ITEM_NOT_FOUND));



        if (!"PENDING".equals(session.getStatus())) {

            throw new AppException(ErrorCode.BAD_REQUEST);

        }



        List<TestSessionQuestion> questions = testQuestionRepository.findAllByTestSessionIdOrderByOrderIndex(sessionId);

        if (questions.isEmpty()) {

            throw new AppException(ErrorCode.ITEM_NOT_FOUND);

        }



        int correctCount = 0;



        // 1. Chấm điểm

        for (TestSessionQuestion q : questions) {

            Integer userAnswerIndex = submission.getAnswers().get(q.getQuestionId());

            q.setUserAnswerIndex(userAnswerIndex);



            if (userAnswerIndex != null && userAnswerIndex.equals(q.getCorrectAnswerIndex())) {

                q.setIsCorrect(true);

                correctCount++;

            } else {

                q.setIsCorrect(false);

            }

        }

        testQuestionRepository.saveAll(questions); // Lưu lại câu trả lời của user



        // 2. Tính toán kết quả

        double percentage = (double) correctCount / questions.size();

        String proficiency = estimateProficiency(percentage * 100); // Ước lượng trình độ

        int expReward = correctCount * 5; // Thưởng 5 EXP cho mỗi câu đúng



        // 3. Cập nhật Session

        session.setStatus("COMPLETED");

        session.setCompletedAt(OffsetDateTime.now());

        session.setScore(correctCount);

        session.setPercentage(percentage * 100); // Lưu 80.0 thay vì 0.8

        session.setProficiencyEstimate(proficiency);

        testSessionRepository.save(session);



        // 4. (Quan trọng) Cập nhật User Profile

        User user = userRepository.findById(userId)

                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));



        // Cập nhật trình độ nếu đây là placement test

        ProficiencyTestConfig config = testConfigRepository.findById(session.getTestConfigId()).orElse(null);

        if (config != null && "PLACEMENT_TEST".equals(config.getTestType())) {

            user.setProficiency(ProficiencyLevel.valueOf(proficiency));

            log.info("Updated user {} proficiency to {}", userId, proficiency);

        }

        // Thưởng EXP

        user.setExp(user.getExp() + expReward);

        userRepository.save(user);



        // 5. Trả về kết quả chi tiết (gồm giải thích)

        List<TestResultResponse.ResultQuestionDto> resultQuestions = questions.stream()

                .map(TestResultResponse.ResultQuestionDto::fromEntity)

                .collect(Collectors.toList());



        return TestResultResponse.builder()

                .sessionId(sessionId)

                .score(correctCount)

                .totalQuestions(questions.size())

                .percentage(session.getPercentage())

                .proficiencyEstimate(proficiency)

                .questions(resultQuestions)

                .build();

    }



    /**

     * Helper: Ước lượng trình độ dựa trên %

     */

    private String estimateProficiency(double percentage) {

        if (percentage < 20) return "A1";

        if (percentage < 40) return "A2";

        if (percentage < 60) return "B1";

        if (percentage < 80) return "B2";

        if (percentage < 95) return "C1";

        return "C2";

    }



}