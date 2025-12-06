package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.LearningActivityEventRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.PronunciationResponseBody;
import com.connectJPA.LinguaVietnameseApp.dto.response.WritingResponseBody;
import com.connectJPA.LinguaVietnameseApp.entity.LessonProgress;
import com.connectJPA.LinguaVietnameseApp.entity.LessonQuestion;
import com.connectJPA.LinguaVietnameseApp.entity.id.LessonProgressId;
import com.connectJPA.LinguaVietnameseApp.enums.ActivityType;
import com.connectJPA.LinguaVietnameseApp.enums.QuestionType;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.grpc.GrpcClientService;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LessonProgressRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LessonQuestionRepository;
import com.connectJPA.LinguaVietnameseApp.service.AuthenticationService;
import com.connectJPA.LinguaVietnameseApp.service.UserLearningActivityService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import reactor.core.publisher.Flux;

import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/skill-lessons")
@RequiredArgsConstructor
@Slf4j
public class SkillLessonController {
    private final GrpcClientService grpcClientService;
    private final LessonProgressRepository lessonProgressRepository;
    private final LessonQuestionRepository lessonQuestionRepository;
    private final AuthenticationService authenticationService;
    private final UserLearningActivityService userLearningActivityService;
    private final ObjectMapper objectMapper;

    // ... (Keeping existing endpoints for Speaking/Writing) ...
    @PostMapping(value = "/speaking/submit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AppApiResponse<PronunciationResponseBody> submitSpeaking(
            @RequestHeader("Authorization") String authorization,
            @RequestPart("audio") MultipartFile audio,
            @RequestParam("lessonQuestionId") UUID lessonQuestionId,
            @RequestParam("languageCode") String languageCode,
            @RequestParam(value = "duration", defaultValue = "0") int duration) {
        // ... (Logic implementation same as provided in previous context)
        return null; // Placeholder to avoid huge file, use your existing logic
    }
    // ... (Other stream/writing endpoints) ...

    // --- REFACTORED ROBUST QUIZ VALIDATION ---

    @PostMapping("/quiz/submit")
    public AppApiResponse<String> submitQuizAnswer(
            @RequestHeader("Authorization") String authorization,
            @RequestParam("lessonQuestionId") UUID lessonQuestionId,
            @RequestParam("selectedOption") String selectedOption,
            @RequestParam(value = "duration", defaultValue = "0") int duration) {

        String token = extractToken(authorization);
        UUID userId = extractUserId(token);

        LessonQuestion question = lessonQuestionRepository.findByLessonQuestionIdAndIsDeletedFalse(lessonQuestionId)
                .orElseThrow(() -> new AppException(ErrorCode.QUESTION_NOT_FOUND));

        boolean isCorrect = validateAnswer(question, selectedOption);
        float score = isCorrect ? 100 : 0;
        String feedback = isCorrect ? "Correct" : "Incorrect";

        saveQuestionProgress(question.getLesson().getLessonId(), userId, score);

        userLearningActivityService.logActivityEndAndCheckChallenges(LearningActivityEventRequest.builder()
                .userId(userId)
                .activityType(ActivityType.LESSON)
                .relatedEntityId(question.getLesson().getLessonId())
                .durationInSeconds(duration)
                .details("Quiz Type: " + question.getQuestionType() + " | Result: " + feedback)
                .build());

        return AppApiResponse.<String>builder()
                .code(200)
                .message("Quiz submitted")
                .result(feedback + ". Explanation: " + question.getExplainAnswer())
                .build();
    }

    private boolean validateAnswer(LessonQuestion question, String selectedOption) {
        if (selectedOption == null || question.getCorrectOption() == null) return false;
        
        String correct = question.getCorrectOption();
        
        // Normalize strings: lowercase and remove extra spaces
        String userNorm = selectedOption.trim().toLowerCase().replaceAll("\\s+", " ");
        String dbNorm = correct.trim().toLowerCase().replaceAll("\\s+", " ");

        switch (question.getQuestionType()) {
            case MULTIPLE_CHOICE:
            case TRUE_FALSE:
                // Handle "optionB" vs "B" vs "option b"
                String cleanUser = userNorm.replace("option", "").replace(" ", "");
                String cleanDb = dbNorm.replace("option", "").replace(" ", "");
                return cleanDb.equals(cleanUser);

            case FILL_IN_THE_BLANK:
                // Support multiple answers split by || or /
                String[] alternatives = dbNorm.split("\\|\\||/");
                for (String alt : alternatives) {
                    if (alt.trim().equals(userNorm)) return true;
                }
                return false;

            case ORDERING:
                // Compare strict sequences (remove all spaces for strictness or keep normalized spaces)
                // Assuming Frontend sends the constructed sentence now.
                return userNorm.replace(" ", "").equals(dbNorm.replace(" ", ""));

            case MATCHING:
                return validateMatching(correct, selectedOption);

            default:
                return userNorm.equals(dbNorm);
        }
    }

    private boolean validateMatching(String correctJsonOrString, String selectedJsonOrString) {
        try {
            // Case 1: Simple string comparison (A-1,B-2 vs A-1,B-2)
            if (correctJsonOrString.trim().equalsIgnoreCase(selectedJsonOrString.trim())) return true;

            // Case 2: JSON comparison (Independent of key order)
            Map<String, String> correctMap = objectMapper.readValue(correctJsonOrString, Map.class);
            Map<String, String> selectedMap = objectMapper.readValue(selectedJsonOrString, Map.class);
            return correctMap.equals(selectedMap);
        } catch (Exception e) {
            // Fallback: Check if Sets of pairs are equal (if format is "A:1;B:2")
            Set<String> correctSet = Arrays.stream(correctJsonOrString.split("[,;]"))
                    .map(String::trim).collect(Collectors.toSet());
            Set<String> selectedSet = Arrays.stream(selectedJsonOrString.split("[,;]"))
                    .map(String::trim).collect(Collectors.toSet());
            return correctSet.equals(selectedSet);
        }
    }

    private String extractToken(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        return authorization.substring(7);
    }

    private UUID extractUserId(String token) {
        return authenticationService.extractTokenByUserId(token);
    }

    private void saveQuestionProgress(UUID lessonId, UUID userId, float score) {
        LessonProgress progress = lessonProgressRepository.findById(new LessonProgressId(lessonId, userId))
                .orElse(LessonProgress.builder()
                        .id(new LessonProgressId(lessonId, userId))
                        .createdAt(OffsetDateTime.now())
                        .build());
        progress.setScore(score);
        progress.setUpdatedAt(OffsetDateTime.now());
        progress.setCompletedAt(OffsetDateTime.now());
        lessonProgressRepository.save(progress);
    }
}