package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.ComprehensionQuestion;
import com.connectJPA.LinguaVietnameseApp.dto.request.SpellingRequestBody;
import com.connectJPA.LinguaVietnameseApp.dto.request.TranslationRequestBody;
import com.connectJPA.LinguaVietnameseApp.dto.response.*;
import com.connectJPA.LinguaVietnameseApp.entity.Lesson;
import com.connectJPA.LinguaVietnameseApp.entity.LessonProgress;
import com.connectJPA.LinguaVietnameseApp.entity.LessonQuestion;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.entity.id.LessonProgressId;
import com.connectJPA.LinguaVietnameseApp.enums.SkillType;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.grpc.GrpcClientService;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LessonProgressRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LessonQuestionRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LessonRepository;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.AuthenticationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import reactor.core.publisher.Flux;
import reactor.core.scheduler.Schedulers;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/skill-lessons")
@RequiredArgsConstructor
@Slf4j
public class SkillLessonController {
    private final GrpcClientService grpcClientService;
    private final LessonRepository lessonRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final LessonQuestionRepository lessonQuestionRepository;
    private final UserRepository userRepository;
    private final AuthenticationService authenticationService;
    private final ObjectMapper objectMapper;

    @PostMapping(
        value = "/speaking/pronunciation-stream",
        consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
        produces = MediaType.APPLICATION_NDJSON_VALUE
    )
    public Flux<String> streamPronunciation(
            @RequestHeader("Authorization") String authorization,
            @RequestPart("audio") MultipartFile audio,
            @RequestParam("lessonId") UUID lessonId,
            @RequestParam("languageCode") String languageCode,
            @RequestParam("referenceText") String referenceText) {

        String token = extractToken(authorization);
        UUID userId = extractUserId(token);

        return Flux.create(sink -> {
            try {
                // Validate DB
                lessonRepository.findByLessonIdAndIsDeletedFalse(lessonId)
                        .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));

                byte[] audioBytes = audio.getBytes();
                log.info("Start streaming: lesson={}, user={}", lessonId, userId);

                // GỌI SERVICE MỚI, TRUYỀN SINK VÀO
                grpcClientService.streamPronunciationAsync(
                    token,
                    audioBytes,
                    languageCode,
                    referenceText,
                    userId.toString(),
                    lessonId.toString(),
                    sink // <--- QUAN TRỌNG NHẤT
                );

            } catch (Exception e) {
                log.error("Error init streaming: {}", e.getMessage(), e);
                sink.error(e);
            }
        });
    }

    @PostMapping(value = "/listening/transcribe", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AppApiResponse<ListeningResponse> processListening(
            @RequestHeader("Authorization") String authorization,
            @RequestPart("audio") MultipartFile audio,
            @RequestParam("lessonId") UUID lessonId,
            @RequestParam("languageCode") String languageCode) {
        String token = extractToken(authorization);
        UUID userId = extractUserId(token);
        
        Lesson lesson = lessonRepository.findByLessonIdAndIsDeletedFalse(lessonId)
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));

        try {
            String transcription = grpcClientService.callSpeechToTextAsync(token, audio.getBytes(), languageCode).get();
            List<ComprehensionQuestion> questions = generateComprehensionQuestions(transcription, languageCode);
            saveLessonProgress(lessonId, userId, questions);

            return AppApiResponse.<ListeningResponse>builder()
                    .code(200)
                    .message("Listening exercise processed successfully")
                    .result(new ListeningResponse(transcription, questions))
                    .build();
        } catch (Exception e) {
            log.error("Listening error: {}", e.getMessage(), e);
            throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
        }
    }

    @PostMapping(value = "/speaking/pronunciation", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AppApiResponse<PronunciationResponseBody> processPronunciation(
            @RequestHeader("Authorization") String authorization,
            @RequestPart("audio") MultipartFile audio,
            @RequestParam("lessonId") UUID lessonId,
            @RequestParam("languageCode") String languageCode) {
        String token = extractToken(authorization);
        UUID userId = extractUserId(token);
        
        Lesson lesson = lessonRepository.findByLessonIdAndIsDeletedFalse(lessonId)
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));

        String referenceText = lesson.getDescription();

        try {
            PronunciationResponseBody response = grpcClientService
                    .callCheckPronunciationAsync(token, audio.getBytes(), languageCode, referenceText)
                    .get();
            saveLessonProgress(lessonId, userId, (float) response.getScore());
            return AppApiResponse.<PronunciationResponseBody>builder()
                    .code(200)
                    .message("Pronunciation exercise processed successfully")
                    .result(response)
                    .build();
        } catch (Exception e) {
            log.error("Pronunciation error: {}", e.getMessage(), e);
            throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
        }
    }

    @PostMapping(value = "/speaking/spelling", consumes = MediaType.APPLICATION_JSON_VALUE)
    public AppApiResponse<List<String>> processSpelling(
            @RequestHeader("Authorization") String authorization,
            @RequestBody SpellingRequestBody request,
            @RequestParam("lessonId") UUID lessonId) {
        String token = extractToken(authorization);
        UUID userId = extractUserId(token);
        
        lessonRepository.findByLessonIdAndIsDeletedFalse(lessonId)
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));

        try {
            List<String> corrections = grpcClientService
                    .callCheckSpellingAsync(token, request.getText(), request.getLanguage())
                    .get();
            saveLessonProgress(lessonId, userId, corrections.isEmpty() ? 100 : 50);
            return AppApiResponse.<List<String>>builder()
                    .code(200)
                    .message("Spelling exercise processed successfully")
                    .result(corrections)
                    .build();
        } catch (Exception e) {
            log.error("Spelling error: {}", e.getMessage(), e);
            throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
        }
    }

    @PostMapping("/reading")
    public AppApiResponse<ReadingResponse> processReading(
            @RequestHeader("Authorization") String authorization,
            @RequestParam("lessonId") UUID lessonId,
            @RequestParam("languageCode") String languageCode) {
        String token = extractToken(authorization);
        UUID userId = extractUserId(token);
        
        Lesson lesson = lessonRepository.findByLessonIdAndIsDeletedFalse(lessonId)
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));

        try {
            // Gọi gRPC
            String passage = grpcClientService
                    .callGeneratePassageAsync(token, userId.toString(), 
                        lesson.getTitle() == null ? "General Topic" : lesson.getTitle(), languageCode)
                    .get();

            // CLEAN UP: Đôi khi Python trả về vẫn còn dư ký tự, clean lần nữa ở Java cho chắc
            passage = passage.replaceAll("^\"|\"$", "").trim(); // Xóa dấu ngoặc kép đầu cuối nếu có
            if (passage.startsWith("```")) {
                 passage = passage.replaceAll("```(json|xml|markdown)?", "").trim();
            }

            // LƯU DATA QUAN TRỌNG: Lưu passage vào description của Lesson
            lesson.setDescription(passage);
            lessonRepository.save(lesson); // Hibernate sẽ lo việc commit

            // Tạo câu hỏi và lưu progress
            List<ComprehensionQuestion> questions = generateComprehensionQuestions(passage, languageCode);
            saveLessonProgress(lessonId, userId, questions);

            return AppApiResponse.<ReadingResponse>builder()
                    .code(200)
                    .message("Reading exercise generated successfully")
                    .result(new ReadingResponse(passage, questions))
                    .build();
        } catch (Exception e) {
            log.error("Reading error: {}", e.getMessage(), e);
            throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
        }
    }

    @PostMapping(value = "/writing", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AppApiResponse<WritingResponseBody> processWriting(
            @RequestHeader("Authorization") String authorization,
            @RequestPart("text") String text,
            @RequestPart(value = "image", required = false) MultipartFile image,
            @RequestParam("lessonId") UUID lessonId,
            @RequestParam("languageCode") String languageCode,
            @RequestParam(value = "generateImage", defaultValue = "false") boolean generateImage) {
        String token = extractToken(authorization);
        UUID userId = extractUserId(token);
        
        Lesson lesson = lessonRepository.findByLessonIdAndIsDeletedFalse(lessonId)
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));

        try {
            byte[] imageData = image != null ? image.getBytes() : null;
            WritingResponseBody response;

            if (generateImage) {
                var imageUrls = grpcClientService
                        .callGeneratePassageAsync(token, userId.toString(), 
                            lesson.getTitle() == null ? "" : lesson.getTitle(), languageCode)
                        .get();

                if (imageUrls != null && !imageUrls.isEmpty()) {
                    try (java.io.InputStream in = new java.net.URL(imageUrls).openStream()) {
                        imageData = in.readAllBytes();
                    } catch (Exception ex) {
                        imageData = null;
                    }
                }
            }

            response = grpcClientService.callCheckWritingWithImageAsync(token, text, imageData).get();
            saveLessonProgress(lessonId, userId, response.getScore());
            
            return AppApiResponse.<WritingResponseBody>builder()
                    .code(200)
                    .message("Writing exercise processed successfully")
                    .result(response)
                    .build();
        } catch (Exception e) {
            log.error("Writing error: {}", e.getMessage(), e);
            throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
        }
    }

    @PostMapping("/writing/translation")
    public AppApiResponse<WritingResponseBody> processTranslation(
            @RequestHeader("Authorization") String authorization,
            @RequestBody TranslationRequestBody request,
            @RequestParam("lessonId") UUID lessonId) {
        String token = extractToken(authorization);
        UUID userId = extractUserId(token);
        
        lessonRepository.findByLessonIdAndIsDeletedFalse(lessonId)
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));

        User user = userRepository.findByUserIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        try {
            String prompt = "Generate a short sentence for a translation exercise in " + user.getNativeLanguageCode();
            String referenceText = grpcClientService
                    .callGenerateTextAsync(token, userId.toString(), prompt, user.getNativeLanguageCode())
                    .get();

            WritingResponseBody response = grpcClientService
                    .callCheckTranslationAsync(token, referenceText, request.getTranslatedText(), request.getTargetLanguage())
                    .get();

            saveLessonProgress(lessonId, userId, response.getScore());
            return AppApiResponse.<WritingResponseBody>builder()
                    .code(200)
                    .message("Translation exercise processed successfully")
                    .result(response)
                    .build();
        } catch (Exception e) {
            log.error("Translation error: {}", e.getMessage(), e);
            throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
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

    private void saveLessonProgress(UUID lessonId, UUID userId, float score) {
        LessonProgress progress = LessonProgress.builder()
                .id(new LessonProgressId(lessonId, userId))
                .score(score)
                .completedAt(OffsetDateTime.now())
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .isDeleted(false)
                .needsReview(false)
                .build();
        lessonProgressRepository.save(progress);
        log.info("Saved lesson progress: lesson={}, user={}, score={}", lessonId, userId, score);
    }

    private void saveLessonProgress(UUID lessonId, UUID userId, List<ComprehensionQuestion> questions) {
        questions.forEach(q -> {
            LessonQuestion question = LessonQuestion.builder()
                    .lessonId(lessonId)
                    .languageCode(q.getLanguageCode())
                    .question(q.getQuestion())
                    .optionA(q.getOptions().get(0))
                    .optionB(q.getOptions().get(1))
                    .optionC(q.getOptions().get(2))
                    .optionD(q.getOptions().get(3))
                    .correctOption(q.getCorrectOption())
                    .skillType(SkillType.READING)
                    .weight(1)
                    .createdAt(OffsetDateTime.now())
                    .updatedAt(OffsetDateTime.now())
                    .isDeleted(false)
                    .build();
            lessonQuestionRepository.save(question);
        });

        LessonProgress progress = LessonProgress.builder()
                .id(new LessonProgressId(lessonId, userId))
                .score(0)
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .isDeleted(false)
                .needsReview(false)
                .build();
        lessonProgressRepository.save(progress);
    }

    private void saveLessonProgressAsync(UUID lessonId, UUID userId, float score) {
        new Thread(() -> {
            try {
                saveLessonProgress(lessonId, userId, score);
            } catch (Exception e) {
                log.error("Error saving lesson progress async: {}", e.getMessage(), e);
            }
        }).start();
    }

    private List<ComprehensionQuestion> generateComprehensionQuestions(String passage, String languageCode) {
        return List.of(
                new ComprehensionQuestion(
                        UUID.randomUUID(),
                        languageCode,
                        "What is the main idea of the passage?",
                        List.of("Option A", "Option B", "Option C", "Option D"),
                        "Option A"
                )
        );
    }
}