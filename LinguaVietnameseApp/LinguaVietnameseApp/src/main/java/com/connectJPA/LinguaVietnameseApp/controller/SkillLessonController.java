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

import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
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

                saveQuestionProgress(question.getLesson().getLessonId(), userId, result.getScore());

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
                String mediaType = "text/plain"; // Default

                // 1. User Upload (Ưu tiên cao nhất)
                if (image != null && !image.isEmpty()) {
                    mediaBytes = image.getBytes();
                    mediaType = image.getContentType();
                } 
                // 2. Context Media (Nếu có URL thì gửi luôn, không check đuôi file nữa)
                else if (question.getMediaUrl() != null && !question.getMediaUrl().isEmpty()) {
                    mediaUrl = question.getMediaUrl();
                    
                    // Cố gắng đoán loại media dựa trên SkillType hoặc QuestionType để AI có context tốt hơn
                    // (Ví dụ: Skill LISTENING -> khả năng cao là Audio)
                    if (question.getSkillType() != null) {
                        switch (question.getSkillType()) {
                            case LISTENING:
                                mediaType = "audio/mpeg"; // Gợi ý cho AI
                                break;
                            case SPEAKING:
                                mediaType = "audio/wav";
                                break;
                            default:
                                mediaType = "image/jpeg"; // Mặc định Writing/Reading thường là hình ảnh
                                break;
                        }
                    } else {
                        mediaType = "application/octet-stream"; // Loại chung chung
                    }
                }

                String prompt = question.getQuestion();

                // 3. Gọi gRPC (Python sẽ lo phần download nếu nhận được URL)
                WritingResponseBody result = grpcClientService.callCheckWritingAssessmentAsync(
                        token, text, prompt, mediaBytes, mediaUrl, mediaType).join();

                saveQuestionProgress(question.getLesson().getLessonId(), userId, result.getScore());

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
                .result(feedback + (isCorrect ? "" : ". Explanation: " + question.getExplainAnswer()))
                .build();
    }

    private boolean validateAnswer(LessonQuestion question, String selectedOption) {
        if (selectedOption == null || question.getCorrectOption() == null) return false;
        
        String correct = question.getCorrectOption();
        
        String userNorm = selectedOption.trim().toLowerCase().replaceAll("\\s+", " ");
        String dbNorm = correct.trim().toLowerCase().replaceAll("\\s+", " ");

        switch (question.getQuestionType()) {
            case MULTIPLE_CHOICE:
            case TRUE_FALSE:
                String cleanUser = userNorm.replace("option", "").replace(" ", "");
                String cleanDb = dbNorm.replace("option", "").replace(" ", "");
                return cleanDb.equals(cleanUser);

            case FILL_IN_THE_BLANK:
                String[] alternatives = dbNorm.split("\\|\\||/");
                for (String alt : alternatives) {
                    if (alt.trim().equals(userNorm)) return true;
                }
                return false;

            case ORDERING:
                return userNorm.replace(" ", "").equals(dbNorm.replace(" ", ""));

            case MATCHING:
                return validateMatching(correct, selectedOption);

            default:
                return userNorm.equals(dbNorm);
        }
    }

    private boolean validateMatching(String correctJsonOrString, String selectedJsonOrString) {
        try {
            if (correctJsonOrString.trim().equalsIgnoreCase(selectedJsonOrString.trim())) return true;
            Map<String, String> correctMap = objectMapper.readValue(correctJsonOrString, Map.class);
            Map<String, String> selectedMap = objectMapper.readValue(selectedJsonOrString, Map.class);
            return correctMap.equals(selectedMap);
        } catch (Exception e) {
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