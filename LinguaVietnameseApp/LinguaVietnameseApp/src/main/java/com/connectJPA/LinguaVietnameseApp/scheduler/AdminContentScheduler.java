package com.connectJPA.LinguaVietnameseApp.scheduler;

import com.connectJPA.LinguaVietnameseApp.entity.LessonQuestion;
import com.connectJPA.LinguaVietnameseApp.enums.SkillType;
import com.connectJPA.LinguaVietnameseApp.grpc.GrpcClientService;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.LessonQuestionRepository;
import com.connectJPA.LinguaVietnameseApp.service.QuestionUpdateService; // THÊM IMPORT NÀY
import com.connectJPA.LinguaVietnameseApp.service.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.net.URL;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.UUID; // Cần thiết cho UUID

@Component
@RequiredArgsConstructor
@Slf4j
public class AdminContentScheduler {

    private final LessonQuestionRepository questionRepository;
    private final GrpcClientService grpcClientService;
    private final StorageService storageService;
    private final QuestionUpdateService questionUpdateService; // INJECT SERVICE MỚI

    // Token dev hoặc lấy từ config
    private final String DEV_TOKEN = "Bearer DEV_SECRET";

    @Scheduled(cron = "0 0 * * * *") // Chạy mỗi giờ (phút thứ 0)
    // Hoặc test: @Scheduled(fixedDelay = 60000) // Chạy mỗi phút
    public void autoGenerateMediaForAdminContent() {
        log.info(">>> Starting Admin Media Generation Job...");

        // 1. Lấy 10 câu hỏi chưa có media để xử lý (tránh bị rate limit)
        List<LessonQuestion> pendingQuestions = questionRepository.findQuestionsMissingMedia(PageRequest.of(0, 10));

        if (pendingQuestions.isEmpty()) {
            log.info("No pending questions found. Job finished.");
            return;
        }

        for (LessonQuestion question : pendingQuestions) {
            try {
                processSingleQuestion(question);
            } catch (Exception e) {
                log.error("Failed to process question ID: {}", question.getLessonQuestionId(), e);
            }
        }
    }

    private void processSingleQuestion(LessonQuestion question) {
        SkillType skill = question.getSkillType();
        String textToProcess = question.getQuestion();
        String topic = "Education"; // Hoặc lấy topic từ Lesson/Category nếu có

        log.info("Processing Question: {} | Skill: {}", textToProcess, skill);

        CompletableFuture<String> mediaProcessFuture = null;

        if (skill == SkillType.LISTENING || skill == SkillType.PRONUNCIATION || skill == SkillType.SPEAKING) {
            // >>> XỬ LÝ AUDIO (TTS)
            mediaProcessFuture = grpcClientService.callGenerateTtsAsync(DEV_TOKEN, textToProcess, "vi")
                .thenApply(audioBytes -> {
                    // Upload byte[] lên Drive
                    String fileName = "auto_audio_" + question.getLessonQuestionId() + ".mp3";
                    String driveId = storageService.uploadBytes(audioBytes, fileName, "audio/mpeg");
                    return storageService.getFileUrl(driveId);
                });

        } else if (skill == SkillType.READING || skill == SkillType.WRITING || skill == SkillType.VOCABULARY) {
            // >>> XỬ LÝ ẢNH (Image Generation)
            // Vì generate_image trả về URL, ta cần tải về rồi upload lại lên Drive của mình để quản lý
            String prompt = "Illustration for Vietnamese lesson: " + textToProcess;

            // Lưu ý: callGenerateImageAsync cần được thêm vào GrpcClientService (xem phần 3 bên dưới)
            mediaProcessFuture = grpcClientService.callGenerateImageAsync(DEV_TOKEN, "admin-bot", prompt, "en")
                .thenApply(response -> {
                    if (response.getImageUrlsList().isEmpty()) return null;
                    String tempUrl = response.getImageUrlsList().get(0);
                    return downloadAndUploadToDrive(tempUrl, question.getLessonQuestionId());
                });
        }

        // Lưu kết quả vào DB
        if (mediaProcessFuture != null) {
            mediaProcessFuture.thenAccept(finalUrl -> {
                if (finalUrl != null) {
                    // SỬ DỤNG SERVICE MỚI ĐỂ ĐẢM BẢO TRANSACTION
                    questionUpdateService.updateMediaUrl(question, finalUrl);
                } else {
                    log.warn(">>> FAILED: No media URL generated for question {}", question.getLessonQuestionId());
                }
            }).exceptionally(ex -> {
                log.error("Error in async media generation chain for question {}", question.getLessonQuestionId(), ex);
                return null;
            });
        }
    }

    private String downloadAndUploadToDrive(String imageUrl, UUID questionId) {
        try (InputStream in = new URL(imageUrl).openStream()) {
            byte[] imageBytes = in.readAllBytes();
            String fileName = "auto_image_" + questionId + ".jpg";
            String driveId = storageService.uploadBytes(imageBytes, fileName, "image/jpeg");
            return storageService.getFileUrl(driveId);
        } catch (Exception e) {
            log.error("Failed to download/upload image for question {}", questionId, e);
            return null;
        }
    }
}