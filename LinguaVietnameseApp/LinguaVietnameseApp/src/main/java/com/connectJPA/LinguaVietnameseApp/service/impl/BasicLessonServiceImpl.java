package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.BasicLessonRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.PronunciationPracticeRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.BasicLessonResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.PronunciationResponseBody;
import com.connectJPA.LinguaVietnameseApp.entity.BasicLesson;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.grpc.GrpcClientService;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.BasicLessonRepository;
import com.connectJPA.LinguaVietnameseApp.service.BasicLessonService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Base64;
import java.util.UUID;
import java.util.concurrent.ExecutionException;

@Service
@RequiredArgsConstructor
@Slf4j
public class BasicLessonServiceImpl implements BasicLessonService {

    private final BasicLessonRepository repository;
    private final GrpcClientService grpcClientService;
    private final ObjectMapper objectMapper;

    @Value("${app.system.token:mock-system-token}")
    private String systemToken;

    @Override
    public BasicLessonResponse create(BasicLessonRequest request) {
        if (request.getLanguageCode() == null || request.getLessonType() == null)
            throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);

        BasicLesson entity = BasicLesson.builder()
                .languageCode(request.getLanguageCode())
                .lessonType(request.getLessonType())
                .symbol(request.getSymbol())
                .romanization(request.getRomanization())
                .meaning(request.getMeaning())
                .pronunciationAudioUrl(request.getPronunciationAudioUrl())
                .videoUrl(request.getVideoUrl())
                .imageUrl(request.getImageUrl())
                .exampleSentence(request.getExampleSentence())
                .exampleTranslation(request.getExampleTranslation())
                .build();
        repository.save(entity);
        return new BasicLessonResponse(entity);
    }

    @Override
    public BasicLessonResponse getById(UUID id) {
        BasicLesson entity = repository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));
        return new BasicLessonResponse(entity);
    }

    @Override
    public Page<BasicLessonResponse> getByLanguageAndType(String languageCode, String lessonType, Pageable pageable) {
        return repository.findByLanguageCodeAndLessonType(languageCode, lessonType, pageable)
                .map(BasicLessonResponse::new);
    }

    @Override
    @Transactional
    public BasicLessonResponse enrichLesson(UUID id) {
        BasicLesson lesson = repository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));

        boolean updated = false;

        // 1. Generate Pronunciation Audio (TTS) if missing
        if (lesson.getPronunciationAudioUrl() == null || lesson.getPronunciationAudioUrl().isEmpty()) {
            try {
                // Use symbol or example sentence for TTS
                String ttsText = lesson.getSymbol();
                if (lesson.getExampleSentence() != null) {
                    ttsText = lesson.getSymbol() + ". " + lesson.getExampleSentence();
                }

                byte[] audioBytes = grpcClientService.callGenerateTtsAsync(systemToken, ttsText, lesson.getLanguageCode()).get();
                if (audioBytes != null && audioBytes.length > 0) {
                    String base64Audio = "data:audio/mp3;base64," + Base64.getEncoder().encodeToString(audioBytes);
                    lesson.setPronunciationAudioUrl(base64Audio);
                    updated = true;
                }
            } catch (Exception e) {
                log.error("Failed to generate TTS for lesson {}: {}", id, e.getMessage());
            }
        }

        // 2. Generate Video URL if missing (Fallback to YouGlish/YouTube Search)
        // Since we can't easily generate video content via AI yet, we create a smart link for the frontend WebView
        if (lesson.getVideoUrl() == null || lesson.getVideoUrl().isEmpty()) {
            // Construct a search URL. 
            // Ideally, we might use YouGlish for English, but YouTube search is generic.
            // We store it so the frontend doesn't have to guess.
            String searchQuery = String.format("https://www.youtube.com/results?search_query=pronounce+%s+in+%s", 
                    lesson.getSymbol(), lesson.getLanguageCode());
            lesson.setVideoUrl(searchQuery);
            updated = true;
        }

        // 3. Generate Content (Meaning, Examples) if missing
        if (lesson.getMeaning() == null || lesson.getExampleSentence() == null) {
            try {
                String prompt = String.format(
                        "Analyze the symbol/character '%s' in language '%s'. " +
                        "Return ONLY a JSON object with these keys: " +
                        "\"meaning\" (short definition in Vietnamese), " +
                        "\"romanization\" (IPA or pinyin), " +
                        "\"exampleSentence\" (a simple sentence using it), " +
                        "\"exampleTranslation\" (Vietnamese translation of sentence).",
                        lesson.getSymbol(), lesson.getLanguageCode()
                );

                String jsonResponse = grpcClientService.callGenerateTextAsync(systemToken, "system", prompt, "en").get();
                
                // Clean markdown if present
                if (jsonResponse.contains("```json")) {
                    jsonResponse = jsonResponse.substring(jsonResponse.indexOf("```json") + 7);
                    if (jsonResponse.contains("```")) {
                        jsonResponse = jsonResponse.substring(0, jsonResponse.indexOf("```"));
                    }
                }

                JsonNode root = objectMapper.readTree(jsonResponse);
                
                if (lesson.getMeaning() == null && root.has("meaning")) {
                    lesson.setMeaning(root.get("meaning").asText());
                    updated = true;
                }
                if (lesson.getRomanization() == null && root.has("romanization")) {
                    lesson.setRomanization(root.get("romanization").asText());
                    updated = true;
                }
                if (lesson.getExampleSentence() == null && root.has("exampleSentence")) {
                    lesson.setExampleSentence(root.get("exampleSentence").asText());
                    updated = true;
                }
                if (lesson.getExampleTranslation() == null && root.has("exampleTranslation")) {
                    lesson.setExampleTranslation(root.get("exampleTranslation").asText());
                    updated = true;
                }

            } catch (Exception e) {
                log.error("Failed to generate text content for lesson {}: {}", id, e.getMessage());
            }
        }

        if (updated) {
            lesson = repository.save(lesson);
        }

        return new BasicLessonResponse(lesson);
    }

    @Override
    public PronunciationResponseBody checkPronunciation(PronunciationPracticeRequest request) throws ExecutionException, InterruptedException {
        // Decode Base64 audio
        byte[] audioData = Base64.getDecoder().decode(request.getAudioData());
        
        // Call gRPC service
        return grpcClientService.callCheckPronunciationAsync(
                systemToken, 
                audioData, 
                request.getLanguage(), 
                request.getReferenceText()
        ).get();
    }
}