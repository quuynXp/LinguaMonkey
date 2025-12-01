package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.PronunciationResponseBody;
import com.connectJPA.LinguaVietnameseApp.dto.response.WritingResponseBody;
import com.connectJPA.LinguaVietnameseApp.entity.LessonProgress;
import com.connectJPA.LinguaVietnameseApp.entity.LessonQuestion;
import com.connectJPA.LinguaVietnameseApp.entity.id.LessonProgressId;
import com.connectJPA.LinguaVietnameseApp.enums.QuestionType;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.grpc.GrpcClientService;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LessonProgressRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LessonQuestionRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.AuthenticationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import reactor.core.publisher.Flux;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/skill-lessons")
@RequiredArgsConstructor
@Slf4j
public class SkillLessonController {
    private final GrpcClientService grpcClientService;
    private final LessonProgressRepository lessonProgressRepository;
    private final LessonQuestionRepository lessonQuestionRepository;
    private final UserRepository userRepository;
    private final AuthenticationService authenticationService;
    private final ObjectMapper objectMapper;

    // --- 1. XỬ LÝ SPEAKING (Cần AI để check âm thanh vs Transcript) ---

    @PostMapping(value = "/speaking/submit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AppApiResponse<PronunciationResponseBody> submitSpeaking(
            @RequestHeader("Authorization") String authorization,
            @RequestPart("audio") MultipartFile audio,
            @RequestParam("lessonQuestionId") UUID lessonQuestionId,
            @RequestParam("languageCode") String languageCode) {

        String token = extractToken(authorization);
        UUID userId = extractUserId(token);

        // Lấy câu hỏi từ DB để lấy Transcript chuẩn
        LessonQuestion question = lessonQuestionRepository.findByLessonQuestionIdAndIsDeletedFalse(lessonQuestionId)
                .orElseThrow(() -> new AppException(ErrorCode.QUESTION_NOT_FOUND));

        if (question.getTranscript() == null || question.getTranscript().isEmpty()) {
            throw new AppException(ErrorCode.INVALID_DATA_FORMAT); // Câu hỏi Speaking bắt buộc phải có transcript
        }

        try {
            // Gọi gRPC: Gửi Audio user + Transcript chuẩn sang Python
            PronunciationResponseBody response = grpcClientService
                    .callCheckPronunciationAsync(token, audio.getBytes(), languageCode, question.getTranscript())
                    .get();

            // Lưu điểm (Logic lưu progress có thể tách ra service riêng để gọn hơn)
            saveQuestionProgress(question.getLesson().getLessonId(), userId, (float) response.getScore());

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

        // Lấy Transcript chuẩn ngay tại Java
        LessonQuestion question = lessonQuestionRepository.findByLessonQuestionIdAndIsDeletedFalse(lessonQuestionId)
                .orElseThrow(() -> new AppException(ErrorCode.QUESTION_NOT_FOUND));

        return Flux.create(sink -> {
            try {
                // Streaming audio + transcript sang Python
                grpcClientService.streamPronunciationAsync(
                    token,
                    audio.getBytes(),
                    languageCode,
                    question.getTranscript(), // Transcript chuẩn từ DB
                    userId.toString(),
                    lessonQuestionId.toString(),
                    sink
                );
            } catch (Exception e) {
                sink.error(e);
            }
        });
    }

    // --- 2. XỬ LÝ WRITING (Cần AI để chấm điểm dựa trên Đề bài + Ảnh) ---

    @PostMapping(value = "/writing/submit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AppApiResponse<WritingResponseBody> submitWriting(
            @RequestHeader("Authorization") String authorization,
            @RequestPart("text") String text,
            @RequestPart(value = "image", required = false) MultipartFile image,
            @RequestParam("lessonQuestionId") UUID lessonQuestionId,
            @RequestParam("languageCode") String languageCode) {

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

    // --- 3. XỬ LÝ READING / LISTENING (QUIZ - KHÔNG CẦN AI) ---
    // User nghe audio (URL từ FE) hoặc đọc bài đọc (từ FE), sau đó chọn đáp án A,B,C,D
    // Java tự check correctOption trong DB.

    @PostMapping("/quiz/submit")
    public AppApiResponse<String> submitQuizAnswer(
            @RequestHeader("Authorization") String authorization,
            @RequestParam("lessonQuestionId") UUID lessonQuestionId,
            @RequestParam("selectedOption") String selectedOption) { // Ví dụ: "optionA"

        String token = extractToken(authorization);
        UUID userId = extractUserId(token);

        LessonQuestion question = lessonQuestionRepository.findByLessonQuestionIdAndIsDeletedFalse(lessonQuestionId)
                .orElseThrow(() -> new AppException(ErrorCode.QUESTION_NOT_FOUND));

        boolean isCorrect = false;
        String feedback = "Incorrect";
        float score = 0;

        // Logic check đáp án cứng
        if (question.getCorrectOption() != null && question.getCorrectOption().equalsIgnoreCase(selectedOption)) {
            isCorrect = true;
            feedback = "Correct";
            score = 100;
        }

        saveQuestionProgress(question.getLesson().getLessonId(), userId, score);

        return AppApiResponse.<String>builder()
                .code(200)
                .message("Quiz submitted")
                .result(feedback + ". Explanation: " + question.getExplainAnswer())
                .build();
    }

    // --- HELPER METHODS ---

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