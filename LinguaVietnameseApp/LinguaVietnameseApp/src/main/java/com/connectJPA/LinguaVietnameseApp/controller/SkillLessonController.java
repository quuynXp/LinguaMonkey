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
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/skill-lessons")
@RequiredArgsConstructor
public class SkillLessonController {
    private final GrpcClientService grpcClientService;
    private final LessonRepository lessonRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final LessonQuestionRepository lessonQuestionRepository;
    private final UserRepository userRepository;
    private final AuthenticationService authenticationService;

    @PostMapping(value = "/listening/transcribe", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AppApiResponse<ListeningResponse> processListening(
            @RequestHeader("Authorization") String authorization,
            @RequestPart("audio") MultipartFile audio,
            @RequestParam("lessonId") UUID lessonId,
            @RequestParam("languageCode") String languageCode) {
        String token = extractToken(authorization);
        Lesson lesson = lessonRepository.findByLessonIdAndIsDeletedFalse(lessonId)
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));

        try {
            String transcription = grpcClientService.callSpeechToTextAsync(token, audio.getBytes(), languageCode).get();
            // Generate comprehension questions (placeholder: can be AI-generated)
            List<ComprehensionQuestion> questions = generateComprehensionQuestions(transcription, languageCode);
            saveLessonProgress(lessonId, extractUserId(token), questions);

            return AppApiResponse.<ListeningResponse>builder()
                    .code(200)
                    .message("Listening exercise processed successfully")
                    .result(new ListeningResponse(transcription, questions))
                    .build();
        } catch (Exception e) {
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
        Lesson lesson = lessonRepository.findByLessonIdAndIsDeletedFalse(lessonId)
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));

        try {
            PronunciationResponseBody response = grpcClientService.callCheckPronunciationAsync(token, audio.getBytes(), languageCode).get();
            saveLessonProgress(lessonId, extractUserId(token), response.getScore());
            return AppApiResponse.<PronunciationResponseBody>builder()
                    .code(200)
                    .message("Pronunciation exercise processed successfully")
                    .result(response)
                    .build();
        } catch (Exception e) {
            throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
        }
    }

    @PostMapping(value = "/speaking/spelling", consumes = MediaType.APPLICATION_JSON_VALUE)
    public AppApiResponse<List<String>> processSpelling(
            @RequestHeader("Authorization") String authorization,
            @RequestBody SpellingRequestBody request,
            @RequestParam("lessonId") UUID lessonId) {
        String token = extractToken(authorization);
        Lesson lesson = lessonRepository.findByLessonIdAndIsDeletedFalse(lessonId)
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));

        try {
            List<String> corrections = grpcClientService.callCheckSpellingAsync(token, request.getText(), request.getLanguage()).get();
            saveLessonProgress(lessonId, extractUserId(token), corrections.isEmpty() ? 100 : 50);
            return AppApiResponse.<List<String>>builder()
                    .code(200)
                    .message("Spelling exercise processed successfully")
                    .result(corrections)
                    .build();
        } catch (Exception e) {
            throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
        }
    }

    // 1) Reading endpoint — truyền topic = lesson title
    @PostMapping("/reading")
    public AppApiResponse<ReadingResponse> processReading(
            @RequestHeader("Authorization") String authorization,
            @RequestParam("lessonId") UUID lessonId,
            @RequestParam("languageCode") String languageCode) {
        String token = extractToken(authorization);
        Lesson lesson = lessonRepository.findByLessonIdAndIsDeletedFalse(lessonId)
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));
        UUID userId = extractUserId(token);
        User user = userRepository.findByUserIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        try {
            // Gọi đúng signature: token, userId, topic, language
            String passage = grpcClientService
                    .callGeneratePassageAsync(token, userId.toString(), lesson.getTitle() == null ? "" : lesson.getTitle(), languageCode)
                    .get();

            List<ComprehensionQuestion> questions = generateComprehensionQuestions(passage, languageCode);
            saveLessonProgress(lessonId, userId, questions);

            return AppApiResponse.<ReadingResponse>builder()
                    .code(200)
                    .message("Reading exercise generated successfully")
                    .result(new ReadingResponse(passage, questions))
                    .build();
        } catch (Exception e) {
            throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
        }
    }


    // 2) Writing endpoint — nếu yêu cầu generateImage, ta gọi generateImage (lấy URL từ proto) và tải về bytes để gửi tiếp cho checkWritingWithImage
    @PostMapping(value = "/writing", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AppApiResponse<WritingResponseBody> processWriting(
            @RequestHeader("Authorization") String authorization,
            @RequestPart("text") String text,
            @RequestPart(value = "image", required = false) MultipartFile image,
            @RequestParam("lessonId") UUID lessonId,
            @RequestParam("languageCode") String languageCode,
            @RequestParam(value = "generateImage", defaultValue = "false") boolean generateImage) {
        String token = extractToken(authorization);
        Lesson lesson = lessonRepository.findByLessonIdAndIsDeletedFalse(lessonId)
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));
        UUID userId = extractUserId(token);
        User user = userRepository.findByUserIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        try {
            byte[] imageData = image != null ? image.getBytes() : null;
            WritingResponseBody response;

            if (generateImage) {
                // Gọi generateImage trên gRPC: dùng lesson title làm prompt (hoặc bạn đổi prompt tuỳ ý)
                var imageUrls = grpcClientService
                        .callGeneratePassageAsync(token, userId.toString(), lesson.getTitle() == null ? "" : lesson.getTitle(), languageCode)
                        .get(); // giả sử trả List<String>

                // Lấy URL đầu tiên (nếu có) và tải về bytes
                if (imageUrls != null && !imageUrls.isEmpty()) {
                    try (java.io.InputStream in = new java.net.URL(imageUrls).openStream()) {
                        imageData = in.readAllBytes();
                    } catch (Exception ex) {
                        // nếu không tải được ảnh, để imageData = null (vẫn tiếp tục đánh giá viết nếu server xử lý bằng text)
                        imageData = null;
                    }
                }

                response = grpcClientService.callCheckWritingWithImageAsync(token, text, imageData).get();
            } else {
                response = grpcClientService.callCheckWritingWithImageAsync(token, text, imageData).get();
            }

            saveLessonProgress(lessonId, userId, response.getScore());
            return AppApiResponse.<WritingResponseBody>builder()
                    .code(200)
                    .message("Writing exercise processed successfully")
                    .result(response)
                    .build();
        } catch (Exception e) {
            throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
        }
    }

    @PostMapping("/writing/translation")
    public AppApiResponse<WritingResponseBody> processTranslation(
            @RequestHeader("Authorization") String authorization,
            @RequestBody TranslationRequestBody request,
            @RequestParam("lessonId") UUID lessonId) {
        String token = extractToken(authorization);
        Lesson lesson = lessonRepository.findByLessonIdAndIsDeletedFalse(lessonId)
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));
        UUID userId = extractUserId(token);
        User user = userRepository.findByUserIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        try {
            // Tạo prompt ngắn để server sinh reference text bằng ngôn ngữ native của user
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
                .build();
        lessonProgressRepository.save(progress);
    }

    private void saveLessonProgress(UUID lessonId, UUID userId, List<ComprehensionQuestion> questions) {
        // Save questions to lesson_questions
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
                    .skillType(SkillType.valueOf(SkillType.READING.name()))
                    .createdAt(OffsetDateTime.now())
                    .updatedAt(OffsetDateTime.now())
                    .isDeleted(false)
                    .build();
            lessonQuestionRepository.save(question);
        });

        // Save progress (score TBD based on user answers)
        LessonProgress progress = LessonProgress.builder()
                .id(new LessonProgressId(lessonId, userId))
                .score(0) // Update later based on answers
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .isDeleted(false)
                .build();
        lessonProgressRepository.save(progress);
    }

    private List<ComprehensionQuestion> generateComprehensionQuestions(String passage, String languageCode) {
        // Placeholder: Call gRPC to generate questions or use static logic
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
