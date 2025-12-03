package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.LearningActivityEventRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.ActivityCompletionResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.PronunciationResponseBody;
import com.connectJPA.LinguaVietnameseApp.dto.response.WritingResponseBody;
import com.connectJPA.LinguaVietnameseApp.entity.LessonProgress;
import com.connectJPA.LinguaVietnameseApp.entity.LessonQuestion;
import com.connectJPA.LinguaVietnameseApp.entity.id.LessonProgressId;
import com.connectJPA.LinguaVietnameseApp.enums.ActivityType;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.grpc.GrpcClientService;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LessonProgressRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LessonQuestionRepository;
import com.connectJPA.LinguaVietnameseApp.service.AuthenticationService;
import com.connectJPA.LinguaVietnameseApp.service.UserLearningActivityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import reactor.core.publisher.Flux;

import java.time.OffsetDateTime;
import java.util.UUID;

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

    @PostMapping(value = "/speaking/submit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AppApiResponse<PronunciationResponseBody> submitSpeaking(
            @RequestHeader("Authorization") String authorization,
            @RequestPart("audio") MultipartFile audio,
            @RequestParam("lessonQuestionId") UUID lessonQuestionId,
            @RequestParam("languageCode") String languageCode,
            @RequestParam(value = "duration", defaultValue = "0") int duration) {

        String token = extractToken(authorization);
        UUID userId = extractUserId(token);

        LessonQuestion question = lessonQuestionRepository.findByLessonQuestionIdAndIsDeletedFalse(lessonQuestionId)
                .orElseThrow(() -> new AppException(ErrorCode.QUESTION_NOT_FOUND));

        if (question.getTranscript() == null || question.getTranscript().isEmpty()) {
            throw new AppException(ErrorCode.INVALID_DATA_FORMAT); 
        }

        try {
            PronunciationResponseBody response = grpcClientService
                    .callCheckPronunciationAsync(token, audio.getBytes(), languageCode, question.getTranscript())
                    .get();

            saveQuestionProgress(question.getLesson().getLessonId(), userId, (float) response.getScore());

            // CENTRALIZED LOGGING & CHALLENGE UPDATE
            userLearningActivityService.logActivityEndAndCheckChallenges(LearningActivityEventRequest.builder()
                    .userId(userId)
                    .activityType(ActivityType.SPEAKING)
                    .relatedEntityId(question.getLesson().getLessonId())
                    .durationInSeconds(duration)
                    .details("Speaking Practice: " + question.getLesson().getTitle())
                    .build());

            return AppApiResponse.<PronunciationResponseBody>builder()
                    .code(200)
                    .message("Speaking evaluated successfully")
                    .result(response)
                    .build();
        } catch (Exception e) {
            log.error("Speaking processing error: {}", e.getMessage(), e);
            throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
        }
    }

    @PostMapping(
        value = "/speaking/stream",
        consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
        produces = MediaType.APPLICATION_NDJSON_VALUE
    )
    public Flux<String> streamSpeaking(
            @RequestHeader("Authorization") String authorization,
            @RequestPart("audio") MultipartFile audio,
            @RequestParam("lessonQuestionId") UUID lessonQuestionId,
            @RequestParam("languageCode") String languageCode) {

        String token = extractToken(authorization);
        UUID userId = extractUserId(token);

        LessonQuestion question = lessonQuestionRepository.findByLessonQuestionIdAndIsDeletedFalse(lessonQuestionId)
                .orElseThrow(() -> new AppException(ErrorCode.QUESTION_NOT_FOUND));

        return Flux.create(sink -> {
            try {
                grpcClientService.streamPronunciationAsync(
                    token,
                    audio.getBytes(),
                    languageCode,
                    question.getTranscript(),
                    userId.toString(),
                    lessonQuestionId.toString(),
                    sink
                );
            } catch (Exception e) {
                sink.error(e);
            }
        });
    }

    @PostMapping(value = "/writing/submit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AppApiResponse<WritingResponseBody> submitWriting(
            @RequestHeader("Authorization") String authorization,
            @RequestPart("text") String text,
            @RequestPart(value = "image", required = false) MultipartFile image,
            @RequestParam("lessonQuestionId") UUID lessonQuestionId,
            @RequestParam("languageCode") String languageCode,
            @RequestParam(value = "duration", defaultValue = "0") int duration) {

        String token = extractToken(authorization);
        UUID userId = extractUserId(token);

        LessonQuestion question = lessonQuestionRepository.findByLessonQuestionIdAndIsDeletedFalse(lessonQuestionId)
                .orElseThrow(() -> new AppException(ErrorCode.QUESTION_NOT_FOUND));

        try {
            byte[] imageData = image != null ? image.getBytes() : null;
            
            WritingResponseBody response = grpcClientService
                    .callCheckWritingWithImageAsync(token, text, question.getQuestion(), imageData)
                    .get();

            saveQuestionProgress(question.getLesson().getLessonId(), userId, response.getScore());

            // CENTRALIZED LOGGING & CHALLENGE UPDATE
            userLearningActivityService.logActivityEndAndCheckChallenges(LearningActivityEventRequest.builder()
                    .userId(userId)
                    .activityType(ActivityType.WRITING)
                    .relatedEntityId(question.getLesson().getLessonId())
                    .durationInSeconds(duration)
                    .details("Writing Practice: " + question.getLesson().getTitle())
                    .build());

            return AppApiResponse.<WritingResponseBody>builder()
                    .code(200)
                    .message("Writing evaluated successfully")
                    .result(response)
                    .build();
        } catch (Exception e) {
            log.error("Writing processing error: {}", e.getMessage(), e);
            throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
        }
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

        boolean isCorrect = false;
        String feedback = "Incorrect";
        float score = 0;

        if (question.getCorrectOption() != null && question.getCorrectOption().equalsIgnoreCase(selectedOption)) {
            isCorrect = true;
            feedback = "Correct";
            score = 100;
        }

        saveQuestionProgress(question.getLesson().getLessonId(), userId, score);

        // CENTRALIZED LOGGING & CHALLENGE UPDATE
        // Map to READING or LISTENING based on question type if possible, otherwise generic LESSON
        ActivityType type = ActivityType.LESSON; 
        
        userLearningActivityService.logActivityEndAndCheckChallenges(LearningActivityEventRequest.builder()
                .userId(userId)
                .activityType(type)
                .relatedEntityId(question.getLesson().getLessonId())
                .durationInSeconds(duration)
                .details("Quiz Answer: " + feedback)
                .build());

        return AppApiResponse.<String>builder()
                .code(200)
                .message("Quiz submitted")
                .result(feedback + ". Explanation: " + question.getExplainAnswer())
                .build();
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