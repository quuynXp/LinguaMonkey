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

    // ... (Giữ nguyên các endpoint Speaking và Writing cũ) ...
    @PostMapping(value = "/speaking/submit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AppApiResponse<PronunciationResponseBody> submitSpeaking(
            @RequestHeader("Authorization") String authorization,
            @RequestPart("audio") MultipartFile audio,
            @RequestParam("lessonQuestionId") UUID lessonQuestionId,
            @RequestParam("languageCode") String languageCode,
            @RequestParam(value = "duration", defaultValue = "0") int duration) {
        // ... (Logic cũ giữ nguyên)
        String token = extractToken(authorization);
        UUID userId = extractUserId(token);
        LessonQuestion question = lessonQuestionRepository.findByLessonQuestionIdAndIsDeletedFalse(lessonQuestionId)
                .orElseThrow(() -> new AppException(ErrorCode.QUESTION_NOT_FOUND));

        try {
            PronunciationResponseBody response = grpcClientService
                    .callCheckPronunciationAsync(token, audio.getBytes(), languageCode, question.getTranscript())
                    .get();
            saveQuestionProgress(question.getLesson().getLessonId(), userId, (float) response.getScore());
            userLearningActivityService.logActivityEndAndCheckChallenges(LearningActivityEventRequest.builder()
                    .userId(userId).activityType(ActivityType.SPEAKING).relatedEntityId(question.getLesson().getLessonId())
                    .durationInSeconds(duration).details("Speaking: " + question.getLesson().getTitle()).build());
            return AppApiResponse.<PronunciationResponseBody>builder().code(200).result(response).build();
        } catch (Exception e) {
            throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
        }
    }

    @PostMapping(value = "/writing/submit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AppApiResponse<WritingResponseBody> submitWriting(
            @RequestHeader("Authorization") String authorization,
            @RequestPart("text") String text,
            @RequestPart(value = "image", required = false) MultipartFile image,
            @RequestParam("lessonQuestionId") UUID lessonQuestionId,
            @RequestParam("languageCode") String languageCode,
            @RequestParam(value = "duration", defaultValue = "0") int duration) {
        // ... (Logic cũ giữ nguyên)
        String token = extractToken(authorization);
        UUID userId = extractUserId(token);
        LessonQuestion question = lessonQuestionRepository.findByLessonQuestionIdAndIsDeletedFalse(lessonQuestionId)
                .orElseThrow(() -> new AppException(ErrorCode.QUESTION_NOT_FOUND));
        try {
            byte[] img = image != null ? image.getBytes() : null;
            WritingResponseBody response = grpcClientService
                    .callCheckWritingWithImageAsync(token, text, question.getQuestion(), img).get();
            saveQuestionProgress(question.getLesson().getLessonId(), userId, response.getScore());
            userLearningActivityService.logActivityEndAndCheckChallenges(LearningActivityEventRequest.builder()
                    .userId(userId).activityType(ActivityType.WRITING).relatedEntityId(question.getLesson().getLessonId())
                    .durationInSeconds(duration).details("Writing: " + question.getLesson().getTitle()).build());
            return AppApiResponse.<WritingResponseBody>builder().code(200).result(response).build();
        } catch (Exception e) {
            throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
        }
    }

    @PostMapping(value = "/speaking/stream", produces = MediaType.APPLICATION_NDJSON_VALUE)
    public Flux<String> streamSpeaking(
            @RequestHeader("Authorization") String authorization,
            @RequestPart("audio") MultipartFile audio,
            @RequestParam("lessonQuestionId") UUID lessonQuestionId,
            @RequestParam("languageCode") String languageCode) {
        // ... (Logic cũ giữ nguyên)
        String token = extractToken(authorization);
        UUID userId = extractUserId(token);
        LessonQuestion question = lessonQuestionRepository.findByLessonQuestionIdAndIsDeletedFalse(lessonQuestionId)
                .orElseThrow(() -> new AppException(ErrorCode.QUESTION_NOT_FOUND));
        return Flux.create(sink -> {
            try {
                grpcClientService.streamPronunciationAsync(token, audio.getBytes(), languageCode,
                        question.getTranscript(), userId.toString(), lessonQuestionId.toString(), sink);
            } catch (Exception e) {
                sink.error(e);
            }
        });
    }

    // --- REFACTORED QUIZ LOGIC ---

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

    return switch (question.getQuestionType()) {
        case MULTIPLE_CHOICE, TRUE_FALSE -> 
            correct.trim().equalsIgnoreCase(selectedOption.trim());
        
        case FILL_IN_THE_BLANK -> 
            correct.trim().equalsIgnoreCase(selectedOption.trim());
        
        case ORDERING -> {
            String normalizedCorrect = correct.replace(" ", "");
            String normalizedSelected = selectedOption.replace(" ", "");
            yield normalizedCorrect.equalsIgnoreCase(normalizedSelected);
        }
        
        case MATCHING -> validateMatching(correct, selectedOption);
        
        default -> false;
    };
}

    private boolean validateMatching(String correctJsonOrString, String selectedJsonOrString) {
        try {
            // Case 1: Simple string comparison (A-1,B-2 vs A-1,B-2)
            if (correctJsonOrString.trim().equalsIgnoreCase(selectedJsonOrString.trim())) return true;

            // Case 2: JSON comparison (Independent of key order)
            // Expecting format: {"A":"1", "B":"2"}
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