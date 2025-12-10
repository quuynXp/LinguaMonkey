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

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
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

    // --- Streaming Endpoint for Pronunciation ---
    @PostMapping(value = "/speaking/stream", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public void streamSpeaking(
            @RequestHeader("Authorization") String authorization,
            @RequestPart("audio") MultipartFile audio,
            @RequestParam("lessonQuestionId") UUID lessonQuestionId,
            @RequestParam("languageCode") String languageCode,
            HttpServletResponse response) {

        String token = extractToken(authorization);
        UUID userId = extractUserId(token);

        // Set Headers for Streaming Response
        response.setContentType("application/x-ndjson"); // Newline Delimited JSON
        response.setCharacterEncoding("UTF-8");

        try {
            LessonQuestion question = lessonQuestionRepository.findById(lessonQuestionId)
                    .orElseThrow(() -> new AppException(ErrorCode.QUESTION_NOT_FOUND));

            byte[] audioBytes = audio.getBytes();
            String referenceText = question.getTranscript() != null ? question.getTranscript() : question.getQuestion();

            // Notify client: Processing started
            writeJsonChunk(response, Map.of("type", "status", "message", "Processing audio..."));

            // Call AI Service (Wait for result since we need to send it back in this stream)
            // Note: In a full reactive stack we would pipe the stream, but here we gather and write.
            PronunciationResponseBody result = grpcClientService.callCheckPronunciationAsync(
                    token, audioBytes, languageCode, referenceText).get();

            saveQuestionActivity(question.getLesson().getLessonId(), userId);

            // Notify client: Final Result
            writeJsonChunk(response, Map.of(
                    "type", "final",
                    "score", result.getScore(),
                    "feedback", result.getFeedback(),
                    "details", result
            ));

        } catch (IOException | InterruptedException | ExecutionException e) {
            log.error("Streaming speaking failed", e);
            try {
                writeJsonChunk(response, Map.of("type", "error", "message", "Processing failed"));
            } catch (IOException ignored) {}
        }
    }

    private void writeJsonChunk(HttpServletResponse response, Object data) throws IOException {
        String json = objectMapper.writeValueAsString(data);
        response.getWriter().write(json + "\n");
        response.getWriter().flush();
    }

    // --- Standard Submit Endpoints ---

    @PostMapping(value = "/speaking/submit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public CompletableFuture<AppApiResponse<PronunciationResponseBody>> submitSpeaking(
            @RequestHeader("Authorization") String authorization,
            @RequestPart("audio") MultipartFile audio,
            @RequestParam("lessonQuestionId") UUID lessonQuestionId,
            @RequestParam("languageCode") String languageCode,
            @RequestParam(value = "duration", defaultValue = "0") int duration) {

        String token = extractToken(authorization);
        UUID userId = extractUserId(token);

        return CompletableFuture.supplyAsync(() -> {
            try {
                LessonQuestion question = lessonQuestionRepository.findById(lessonQuestionId)
                        .orElseThrow(() -> new AppException(ErrorCode.QUESTION_NOT_FOUND));

                byte[] audioBytes = audio.getBytes();
                String referenceText = question.getTranscript() != null ? question.getTranscript() : question.getQuestion();

                PronunciationResponseBody result = grpcClientService.callCheckPronunciationAsync(
                        token, audioBytes, languageCode, referenceText).join();

                saveQuestionActivity(question.getLesson().getLessonId(), userId);

                return AppApiResponse.<PronunciationResponseBody>builder()
                        .code(200)
                        .result(result)
                        .build();
            } catch (Exception e) {
                log.error("Speaking check failed", e);
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            }
        });
    }

    @PostMapping(value = "/writing/submit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public CompletableFuture<AppApiResponse<WritingResponseBody>> submitWriting(
            @RequestHeader("Authorization") String authorization,
            @RequestParam("text") String text,
            @RequestPart(value = "image", required = false) MultipartFile image,
            @RequestParam("lessonQuestionId") UUID lessonQuestionId,
            @RequestParam("languageCode") String languageCode,
            @RequestParam(value = "duration", defaultValue = "0") int duration) {

        String token = extractToken(authorization);
        UUID userId = extractUserId(token);

        return CompletableFuture.supplyAsync(() -> {
            try {
                LessonQuestion question = lessonQuestionRepository.findById(lessonQuestionId)
                        .orElseThrow(() -> new AppException(ErrorCode.QUESTION_NOT_FOUND));

                byte[] mediaBytes = null;
                String mediaUrl = null;
                String mediaType = "text/plain";

                if (image != null && !image.isEmpty()) {
                    mediaBytes = image.getBytes();
                    mediaType = image.getContentType();
                } 
                else if (question.getMediaUrl() != null && !question.getMediaUrl().isEmpty()) {
                    mediaUrl = question.getMediaUrl();
                    mediaType = "image/jpeg";
                }

                String prompt = question.getQuestion();

                WritingResponseBody result = grpcClientService.callCheckWritingAssessmentAsync(
                        token, text, prompt, mediaBytes, mediaUrl, mediaType).join();

                saveQuestionActivity(question.getLesson().getLessonId(), userId);

                userLearningActivityService.logActivityEndAndCheckChallenges(LearningActivityEventRequest.builder()
                        .userId(userId)
                        .activityType(ActivityType.LESSON)
                        .relatedEntityId(question.getLesson().getLessonId())
                        .durationInSeconds(duration)
                        .details("Writing Score: " + result.getScore())
                        .build());

                return AppApiResponse.<WritingResponseBody>builder()
                        .code(200)
                        .result(result)
                        .build();
            } catch (Exception e) {
                log.error("Writing check failed", e);
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            }
        });
    }

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

        saveQuestionActivity(question.getLesson().getLessonId(), userId);

        userLearningActivityService.logActivityEndAndCheckChallenges(LearningActivityEventRequest.builder()
                .userId(userId)
                .activityType(ActivityType.LESSON)
                .relatedEntityId(question.getLesson().getLessonId())
                .durationInSeconds(duration)
                .details("Quiz Type: " + question.getQuestionType())
                .build());

        return AppApiResponse.<String>builder()
                .code(200)
                .message("Quiz submitted")
                .result("Submitted")
                .build();
    }

    private void saveQuestionActivity(UUID lessonId, UUID userId) {
        LessonProgress progress = lessonProgressRepository.findById(new LessonProgressId(lessonId, userId))
                .orElse(LessonProgress.builder()
                        .id(new LessonProgressId(lessonId, userId))
                        .createdAt(OffsetDateTime.now())
                        .score(0f)
                        .build());
        
        progress.setUpdatedAt(OffsetDateTime.now());
        lessonProgressRepository.save(progress);
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

    private void writeJsonChunk(HttpServletResponse response, Map<String, Object> data) throws IOException {
        String json = objectMapper.writeValueAsString(data);
        response.getWriter().write(json + "\n");
        response.getWriter().flush();
    }
}