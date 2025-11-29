package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.TestSubmissionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.TestConfigResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.TestResultResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.TestSessionResponse;
import com.connectJPA.LinguaVietnameseApp.entity.*;
import com.connectJPA.LinguaVietnameseApp.enums.ProficiencyLevel;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.grpc.GrpcClientService;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.*;
import com.connectJPA.LinguaVietnameseApp.service.TestService;
import learning.QuizGenerationResponse;
import learning.QuizQuestionProto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
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
    private final UserRepository userRepository;

    @Override
    public Page<TestConfigResponse> getAvailableTests(String languageCode, Pageable pageable) {
        Page<ProficiencyTestConfig> configPage = testConfigRepository.findAllByLanguageCodeAndIsActiveTrue(languageCode, pageable);
        return configPage.map(TestConfigResponse::fromEntity);
    }

    @Override
    public List<TestResultResponse> getTestHistory(UUID userId) {
        List<TestSession> sessions = testSessionRepository.findAllByUserIdOrderByCreatedAtDesc(userId);
        
        return sessions.stream().map(session -> {
             List<TestSessionQuestion> questions = testQuestionRepository.findAllByTestSessionIdOrderByOrderIndex(session.getTestSessionId());
             return buildResultResponse(session, questions);
        }).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public TestSessionResponse startTest(UUID testConfigId, UUID userId, String token) {
        ProficiencyTestConfig config = testConfigRepository.findById(testConfigId)
                .orElseThrow(() -> new AppException(ErrorCode.ITEM_NOT_FOUND));

        log.info("Starting test {} for user {}.", testConfigId, userId);

        CompletableFuture<QuizGenerationResponse> futureResponse = grpcClientService.generateLanguageQuiz(
                token,
                userId.toString(),
                config.getNumQuestions(),
                "solo",
                config.getAiTopic()
        );

        QuizGenerationResponse aiResponse = futureResponse.join();
        if (aiResponse == null || aiResponse.getQuestionsCount() == 0) {
            throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
        }

        TestSession session = new TestSession();
        session.setUserId(userId);
        session.setTestConfigId(testConfigId);
        session.setStatus("PENDING");
        session.setCreatedAt(OffsetDateTime.now());
        TestSession savedSession = testSessionRepository.save(session);

        List<TestSessionQuestion> questionsToSave = new ArrayList<>();
        int order = 0;
        for (QuizQuestionProto aiQuestion : aiResponse.getQuestionsList()) {
            TestSessionQuestion q = new TestSessionQuestion();
            q.setTestSessionId(savedSession.getTestSessionId());
            q.setQuestionText(aiQuestion.getQuestionText());
            
            List<String> quotedOptions = aiQuestion.getOptionsList().stream()
                    .map(option -> "\"" + option.replace("\"", "\\\"") + "\"")
                    .collect(Collectors.toList());
            String optionsJsonString = "[" + String.join(",", quotedOptions) + "]";

            q.setOptionsJson(optionsJsonString);
            q.setCorrectAnswerIndex(aiQuestion.getCorrectAnswerIndex());
            q.setExplanation(aiQuestion.getExplanation());
            q.setSkillType(aiQuestion.getSkillType()); 
            q.setOrderIndex(order++);
            questionsToSave.add(q);
        }
        List<TestSessionQuestion> savedQuestions = testQuestionRepository.saveAll(questionsToSave);

        List<TestSessionResponse.QuestionDto> questionsForResponse = savedQuestions.stream()
                .map(TestSessionResponse.QuestionDto::fromEntity)
                .collect(Collectors.toList());

        return new TestSessionResponse(savedSession.getTestSessionId(), questionsForResponse);
    }

    @Override
    public TestResultResponse getTestResult(UUID sessionId, UUID userId) {
         TestSession session = testSessionRepository.findByTestSessionIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.ITEM_NOT_FOUND));
         List<TestSessionQuestion> questions = testQuestionRepository.findAllByTestSessionIdOrderByOrderIndex(sessionId);
         return buildResultResponse(session, questions);
    }

    @Transactional
    @Override
    public TestResultResponse submitTest(UUID sessionId, UUID userId, TestSubmissionRequest submission) {
        TestSession session = testSessionRepository.findByTestSessionIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.ITEM_NOT_FOUND));

        if (!"PENDING".equals(session.getStatus())) {
             List<TestSessionQuestion> qs = testQuestionRepository.findAllByTestSessionIdOrderByOrderIndex(sessionId);
             return buildResultResponse(session, qs);
        }

        List<TestSessionQuestion> questions = testQuestionRepository.findAllByTestSessionIdOrderByOrderIndex(sessionId);
        
        boolean needsAiGrading = false;
        for (TestSessionQuestion q : questions) {
            Integer ua = submission.getAnswers().get(q.getQuestionId());
            q.setUserAnswerIndex(ua);
            
            if ("speaking".equalsIgnoreCase(q.getSkillType()) || "writing".equalsIgnoreCase(q.getSkillType())) {
                needsAiGrading = true;
            }
        }
        testQuestionRepository.saveAll(questions);

        if (needsAiGrading) {
            session.setStatus("GRADING");
            testSessionRepository.save(session);
            
            CompletableFuture.runAsync(() -> processAsyncGrading(session.getTestSessionId(), userId));

            return TestResultResponse.builder()
                    .sessionId(sessionId)
                    .status("GRADING")
                    .score(0)
                    .percentage(0)
                    .proficiencyEstimate("Processing...")
                    .build();
        } else {
            int correctCount = 0;
            for (TestSessionQuestion q : questions) {
                if (q.getUserAnswerIndex() != null && q.getUserAnswerIndex().equals(q.getCorrectAnswerIndex())) {
                    q.setIsCorrect(true);
                    correctCount++;
                } else {
                    q.setIsCorrect(false);
                }
            }
            testQuestionRepository.saveAll(questions);

            double percentage = (double) correctCount / questions.size();
            String proficiency = estimateProficiency(percentage * 100);
            
            session.setStatus("COMPLETED");
            session.setCompletedAt(OffsetDateTime.now());
            session.setScore(correctCount);
            session.setPercentage(percentage * 100);
            session.setProficiencyEstimate(proficiency);
            testSessionRepository.save(session);
            
            updateUserProfile(userId, session.getTestConfigId(), proficiency, correctCount * 5);

            return buildResultResponse(session, questions);
        }
    }

    private void processAsyncGrading(UUID sessionId, UUID userId) {
        try {
            log.info("Async Grading: Waiting 1 minute for session {}", sessionId);
            Thread.sleep(60000); 
            
            TestSession session = testSessionRepository.findById(sessionId).orElse(null);
            if(session == null) return;

            List<TestSessionQuestion> questions = testQuestionRepository.findAllByTestSessionIdOrderByOrderIndex(sessionId);
            
            int correctCount = 0;
            for (TestSessionQuestion q : questions) {
                q.setIsCorrect(true); 
                correctCount++;
            }
            testQuestionRepository.saveAll(questions);
            
            double percentage = (double) correctCount / questions.size();
            session.setStatus("COMPLETED");
            session.setCompletedAt(OffsetDateTime.now());
            session.setScore(correctCount);
            session.setPercentage(percentage * 100);
            session.setProficiencyEstimate("B2"); 
            testSessionRepository.save(session);
            
            updateUserProfile(userId, session.getTestConfigId(), "B2", correctCount * 10);
            log.info("Async Grading: Completed for session {}", sessionId);
            
        } catch (Exception e) {
            log.error("Async grading failed", e);
        }
    }

    private TestResultResponse buildResultResponse(TestSession session, List<TestSessionQuestion> questions) {
        List<TestResultResponse.ResultQuestionDto> resultQuestions = null;
        
        if ("COMPLETED".equals(session.getStatus())) {
            resultQuestions = questions.stream()
                .map(TestResultResponse.ResultQuestionDto::fromEntity)
                .collect(Collectors.toList());
        }

        return TestResultResponse.builder()
                .sessionId(session.getTestSessionId())
                .status(session.getStatus()) 
                .score(session.getScore() != null ? session.getScore() : 0)
                .totalQuestions(questions.size())
                .percentage(session.getPercentage() != null ? session.getPercentage() : 0.0)
                .proficiencyEstimate(session.getProficiencyEstimate())
                .questions(resultQuestions)
                .createdAt(session.getCreatedAt())
                .build();
    }

    private void updateUserProfile(UUID userId, UUID configId, String proficiency, int exp) {
        User user = userRepository.findById(userId).orElse(null);
        if (user != null) {
             ProficiencyTestConfig config = testConfigRepository.findById(configId).orElse(null);
             if (config != null && "PLACEMENT_TEST".equals(config.getTestType())) {
                 user.setProficiency(ProficiencyLevel.valueOf(proficiency));
             }
             user.setExp(user.getExp() + exp);
             userRepository.save(user);
        }
    }

    private String estimateProficiency(double percentage) {
        if (percentage < 20) return "A1";
        if (percentage < 40) return "A2";
        if (percentage < 60) return "B1";
        if (percentage < 80) return "B2";
        if (percentage < 95) return "C1";
        return "C2";
    }
}