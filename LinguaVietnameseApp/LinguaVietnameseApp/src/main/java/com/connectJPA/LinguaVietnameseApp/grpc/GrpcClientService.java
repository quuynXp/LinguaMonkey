package com.connectJPA.LinguaVietnameseApp.grpc;

import com.connectJPA.LinguaVietnameseApp.dto.ChatMessageBody;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseEvaluationResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.PronunciationResponseBody;
import com.connectJPA.LinguaVietnameseApp.dto.response.WritingResponseBody;
import com.connectJPA.LinguaVietnameseApp.entity.Lesson;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.protobuf.ByteString;
import com.connectJPA.LinguaVietnameseApp.dto.response.ReviewQualityResponse;

import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.stub.StreamObserver;
import learning.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.FluxSink;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GrpcClientService {

    @Value("${grpc.client.learning-service.address}")
    private String grpcTarget;

    private final ObjectMapper objectMapper;
    private ManagedChannel channel;
    private LearningServiceGrpc.LearningServiceFutureStub futureStub;
    private LearningServiceGrpc.LearningServiceStub asyncStub;

    // Timeout for unary calls (prevent hanging)
    private static final long GRPC_TIMEOUT_SEC = 10; 

    @PostConstruct
    public void init() {
        log.info("Initializing gRPC Channel to: {}", grpcTarget);
        String target = grpcTarget.replace("static://", "").replace("http://", "");
        this.channel = ManagedChannelBuilder.forTarget(target)
                .usePlaintext()
                .keepAliveTime(30, TimeUnit.SECONDS)
                .keepAliveTimeout(10, TimeUnit.SECONDS)
                .build();
        this.futureStub = LearningServiceGrpc.newFutureStub(channel);
        this.asyncStub = LearningServiceGrpc.newStub(channel);
    }

    @PreDestroy
    public void shutdown() {
        if (channel != null && !channel.isShutdown()) {
            channel.shutdown();
        }
    }

    private LearningServiceGrpc.LearningServiceFutureStub getStubWithAuth(String token) {
        // Add Deadline to avoid infinite waiting
        LearningServiceGrpc.LearningServiceFutureStub stub = futureStub.withDeadlineAfter(GRPC_TIMEOUT_SEC, TimeUnit.SECONDS);
        if (token == null || token.isEmpty()) return stub;
        return stub.withCallCredentials(new BearerTokenCredentials(token));
    }

    private LearningServiceGrpc.LearningServiceStub getAsyncStubWithAuth(String token) {
        if (token == null || token.isEmpty()) return asyncStub;
        return asyncStub.withCallCredentials(new BearerTokenCredentials(token));
    }

    public CompletableFuture<TranslateResponse> callTranslateAsync(String token, String text, String sourceLang, String targetLang) {
        TranslateRequest request = TranslateRequest.newBuilder()
                .setText(text == null ? "" : text)
                .setSourceLanguage(sourceLang == null ? "auto" : sourceLang)
                .setTargetLanguage(targetLang == null ? "vi" : targetLang)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            log.info(">>> [gRPC] Sending Translate request: '{}' ({}->{})", text, sourceLang, targetLang);
            try {
                TranslateResponse response = getStubWithAuth(token).translate(request).get();
                log.info("<<< [gRPC] Translate success: {}", response.getTranslatedText());
                return response;
            } catch (Exception e) {
                log.error("!!! [gRPC] Translate Failed for '{}'. Error: {}", text, e.getMessage(), e); // Added stack trace logging
                // Return fallback instead of throwing to prevent blocking other async operations
                return TranslateResponse.newBuilder()
                        .setTranslatedText(text) 
                        .setSourceLanguageDetected("unknown")
                        .setError("Service unavailable: " + e.getMessage())
                        .build();
            }
        });
    }

    public CompletableFuture<String> callChatWithAIAsync(String token, String userId, String message, List<ChatMessageBody> history) {
        ChatRequest request = ChatRequest.newBuilder()
                .setUserId(userId)
                .setMessage(message)
                .addAllHistory(history.stream()
                        .map(h -> ChatMessage.newBuilder().setRole(h.getRole()).setContent(h.getContent()).build())
                        .collect(Collectors.toList()))
                .build();

        return CompletableFuture.supplyAsync(() -> {
            log.info(">>> [gRPC] Sending ChatAI request for user: {}", userId);
            try {
                ChatResponse response = getStubWithAuth(token).chatWithAI(request).get();
                if (response.getError() != null && !response.getError().isEmpty()) {
                     log.error("<<< [gRPC] ChatAI returned application error: {}", response.getError());
                }
                return response.getResponse();
            } catch (Exception e) {
                log.error("!!! [gRPC] ChatAI Failed: {}", e.getMessage(), e);
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            }
        });
    }

    public CompletableFuture<WritingResponseBody> callCheckWritingAssessmentAsync(
            String token, String userText, String prompt, 
            byte[] mediaData, String mediaUrl, String mediaType) {
        
        WritingAssessmentRequest.Builder requestBuilder = WritingAssessmentRequest.newBuilder()
                .setUserText(userText)
                .setPrompt(prompt)
                .setMediaType(mediaType != null ? mediaType : "text/plain")
                .setLanguage("en");

        if (mediaData != null && mediaData.length > 0) {
            requestBuilder.setMedia(MediaRef.newBuilder().setInlineData(ByteString.copyFrom(mediaData)));
        } else if (mediaUrl != null && !mediaUrl.isEmpty()) {
            requestBuilder.setMedia(MediaRef.newBuilder().setUrl(mediaUrl));
        }

        return CompletableFuture.supplyAsync(() -> {
            try {
                WritingAssessmentResponse response = getStubWithAuth(token).checkWritingAssessment(requestBuilder.build()).get();
                WritingResponseBody result = new WritingResponseBody();
                result.setFeedback(response.getFeedback());
                result.setScore(response.getScore());
                return result;
            } catch (Exception e) {
                log.error("gRPC CheckWritingAssessment failed", e);
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            }
        });
    }

    public CompletableFuture<SeedDataResponse> callGenerateSeedDataAsync(
            String token, String rawQuestion, List<String> rawOptions, String topic) {
        
        SeedDataRequest request = SeedDataRequest.newBuilder()
                .setRawQuestion(rawQuestion == null ? "" : rawQuestion)
                .addAllRawOptions(rawOptions)
                .setTopic(topic == null ? "" : topic)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                return getStubWithAuth(token).generateSeedData(request).get();
            } catch (Exception e) {
                log.error("gRPC call generateSeedData failed", e);
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            }
        });
    }

    public CompletableFuture<GenerateImageResponse> callGenerateImageAsync(String token, String userId, String prompt, String language) {
        GenerateImageRequest request = GenerateImageRequest.newBuilder()
                .setUserId(userId)
                .setPrompt(prompt)
                .setLanguage(language)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                return getStubWithAuth(token).generateImage(request).get();
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            }
        });
    }

    public CompletableFuture<CourseEvaluationResponse> callEvaluateCourseVersionAsync(
            String token, String courseTitle, String courseDescription, List<Lesson> lessons) {
        
        List<LessonMetadata> lessonMetas = lessons.stream()
                .map(l -> LessonMetadata.newBuilder()
                        .setLessonTitle(l.getTitle() != null ? l.getTitle() : "Untitled")
                        .setLessonType(l.getLessonType() != null ? l.getLessonType().name() : "UNKNOWN")
                        .setDurationSeconds(l.getDurationSeconds() != null ? l.getDurationSeconds() : 0)
                        .build())
                .collect(Collectors.toList());

        EvaluateCourseVersionRequest request = EvaluateCourseVersionRequest.newBuilder()
                .setCourseTitle(courseTitle)
                .setCourseDescription(courseDescription != null ? courseDescription : "")
                .addAllLessons(lessonMetas)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                EvaluateCourseVersionResponse response = getStubWithAuth(token).evaluateCourseVersion(request).get();
                return CourseEvaluationResponse.builder()
                        .rating(response.getRating())
                        .reviewComment(response.getReviewComment())
                        .build();
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            }
        });
    }

    public CompletableFuture<FindMatchResponse> callFindMatchAsync(
            String token, String userId, CallPreferences userPrefs, List<MatchCandidate> candidates) {
        
        FindMatchRequest request = FindMatchRequest.newBuilder()
                .setCurrentUserId(userId)
                .setCurrentUserPrefs(userPrefs)
                .addAllCandidates(candidates)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                return getStubWithAuth(token).findMatch(request).get();
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            }
        });
    }

    public CompletableFuture<ReviewQualityResponse> callAnalyzeReviewQualityAsync(String token, String userId, String contentId, String content, float rating, String contentType) {
        ReviewQualityRequest request = ReviewQualityRequest.newBuilder()
                .setUserId(userId)
                .setContentId(contentId)
                .setReviewText(content)
                .setRating(rating)
                .setContentType(contentType)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                learning.ReviewQualityResponse response = getStubWithAuth(token).analyzeReviewQuality(request).get();
                return ReviewQualityResponse.builder()
                        .isValid(response.getIsValid())
                        .isToxic(response.getIsToxic()) 
                        .sentiment(response.getSentiment())
                        .topics(response.getTopicsList())
                        .suggestedAction(response.getSuggestedAction())
                        .build();
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            }
        });
    }

    public CompletableFuture<QuizGenerationResponse> generateLanguageQuiz(String token, String userId, int numQuestions, String mode, String topic) {
        QuizGenerationRequest.Builder requestBuilder = QuizGenerationRequest.newBuilder()
                .setNumQuestions(numQuestions)
                .setMode(mode);

        if (userId != null && !userId.isBlank()) requestBuilder.setUserId(userId);
        if (topic != null && !topic.isBlank()) requestBuilder.setTopic(topic);

        return CompletableFuture.supplyAsync(() -> {
            try {
                return getStubWithAuth(token).generateLanguageQuiz(requestBuilder.build()).get();
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            }
        });
    }

    public CompletableFuture<String> callSpeechToTextAsync(String token, byte[] audioData, String language) {
        SpeechRequest request = SpeechRequest.newBuilder()
                .setAudio(MediaRef.newBuilder().setInlineData(ByteString.copyFrom(audioData)))
                .setLanguage(language)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                SpeechResponse response = getStubWithAuth(token).speechToText(request).get();
                return response.getText();
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            }
        });
    }

    public CompletableFuture<byte[]> callGenerateTtsAsync(String token, String text, String language) {
        TtsRequest request = TtsRequest.newBuilder().setText(text).setLanguage(language).build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                TtsResponse response = getStubWithAuth(token).generateTts(request).get();
                return response.getAudioData().toByteArray();
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            }
        });
    }

    public CompletableFuture<PronunciationResponseBody> callCheckPronunciationAsync(
            String token, byte[] audioData, String language, String referenceText) {
        
        PronunciationRequest request = PronunciationRequest.newBuilder()
                .setAudio(MediaRef.newBuilder().setInlineData(ByteString.copyFrom(audioData)))
                .setLanguage(language)
                .setReferenceText(referenceText)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                PronunciationResponse response = getStubWithAuth(token).checkPronunciation(request).get();
                PronunciationResponseBody result = new PronunciationResponseBody();
                result.setFeedback(response.getFeedback());
                result.setScore(response.getScore());
                return result;
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            }
        });
    }
    
    public void streamPronunciationAsync(
            String token, byte[] audioData, String language, String referenceText,
            String userId, String lessonQuestionId, FluxSink<String> sink) {
        
        StreamObserver<PronunciationChunkResponse> responseObserver = new StreamObserver<>() {
            @Override
            public void onNext(PronunciationChunkResponse response) {
                try {
                    Map<String, Object> data = new HashMap<>();
                    data.put("type", response.getChunkType());
                    data.put("feedback", response.getFeedback());
                    if (response.getIsFinal()) {
                        data.put("score", response.getScore());
                    }
                    sink.next(objectMapper.writeValueAsString(data));
                } catch (Exception e) {
                    sink.error(e);
                }
            }

            @Override
            public void onError(Throwable t) {
                sink.error(t);
            }

            @Override
            public void onCompleted() {
                sink.complete();
            }
        };

        StreamObserver<PronunciationChunk> requestObserver = getAsyncStubWithAuth(token).streamPronunciation(responseObserver);
        
        CompletableFuture.runAsync(() -> {
             try {
                int chunkSize = 16 * 1024;
                int length = audioData.length;
                int offset = 0;
                int seq = 0;

                while (offset < length) {
                    int end = Math.min(length, offset + chunkSize);
                    byte[] chunkBytes = java.util.Arrays.copyOfRange(audioData, offset, end);

                    PronunciationChunk.Builder chunkBuilder = PronunciationChunk.newBuilder()
                            .setAudioChunk(ByteString.copyFrom(chunkBytes))
                            .setSequence(seq++)
                            .setIsFinal(end == length);
                    
                    if (seq == 1) chunkBuilder.setReferenceText(referenceText);

                    requestObserver.onNext(chunkBuilder.build());
                    offset = end;
                    Thread.sleep(10); 
                }
                requestObserver.onCompleted();
            } catch (Exception e) {
                requestObserver.onError(e);
            }
        });
    }

    public CompletableFuture<List<String>> callCheckSpellingAsync(String token, String text, String language) {
        SpellingRequest request = SpellingRequest.newBuilder().setText(text).setLanguage(language).build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                SpellingResponse response = getStubWithAuth(token).checkSpelling(request).get();
                return response.getCorrectionsList();
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            }
        });
    }

    public CompletableFuture<WritingResponseBody> callCheckTranslationAsync(String token, String referenceText, String translatedText, String targetLanguage) {
        CheckTranslationRequest request = CheckTranslationRequest.newBuilder()
                .setReferenceText(referenceText)
                .setTranslatedText(translatedText)
                .setTargetLanguage(targetLanguage)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                CheckTranslationResponse response = getStubWithAuth(token).checkTranslation(request).get();
                WritingResponseBody result = new WritingResponseBody();
                result.setFeedback(response.getFeedback());
                result.setScore(response.getScore());
                return result;
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            }
        });
    }

    public CompletableFuture<String> callGenerateTextAsync(String token, String userId, String prompt, String language) {
        GenerateTextRequest request = GenerateTextRequest.newBuilder()
                .setUserId(userId)
                .setPrompt(prompt)
                .setLanguage(language)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                GenerateTextResponse response = getStubWithAuth(token).generateText(request).get();
                return response.getText();
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            }
        });
    }

    public CompletableFuture<String> callGeneratePassageAsync(String token, String userId, String topic, String language) {
        GeneratePassageRequest request = GeneratePassageRequest.newBuilder()
                .setUserId(userId)
                .setTopic(topic)
                .setLanguage(language)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                GeneratePassageResponse response = getStubWithAuth(token).generatePassage(request).get();
                return response.getPassage();
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            }
        });
    }

    public CompletableFuture<RoadmapResponse> callCreateOrUpdateRoadmapAsync(String token, String userId, String roadmapId, String title, String description, String language) {
        RoadmapRequest request = RoadmapRequest.newBuilder()
                .setUserId(userId)
                .setRoadmapId(roadmapId)
                .setTitle(title)
                .setDescription(description)
                .setLanguage(language)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                return getStubWithAuth(token).createOrUpdateRoadmap(request).get();
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            }
        });
    }

    public CompletableFuture<RoadmapDetailedResponse> callCreateOrUpdateRoadmapDetailedAsync(String token, String userId, String roadmapId, String language, String prompt, boolean asUserSpecific) {
        RoadmapDetailedRequest request = RoadmapDetailedRequest.newBuilder()
                .setUserId(userId)
                .setRoadmapId(roadmapId)
                .setLanguage(language)
                .setPrompt(prompt)
                .setAsUserSpecific(asUserSpecific)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                return getStubWithAuth(token).createOrUpdateRoadmapDetailed(request).get();
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            }
        });
    }

    public CompletableFuture<CourseQualityResponse> callAnalyzeCourseQualityAsync(String token, String courseId, List<String> lessonIds) {
        CourseQualityRequest request = CourseQualityRequest.newBuilder()
                .setCourseId(courseId)
                .addAllLessonIds(lessonIds)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                return getStubWithAuth(token).analyzeCourseQuality(request).get();
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            }
        });
    }

    public CompletableFuture<RefundDecisionResponse> callRefundDecisionAsync(String token, String transactionId, String userId, String courseId, String reasonText) {
        RefundDecisionRequest request = RefundDecisionRequest.newBuilder()
                .setTransactionId(transactionId)
                .setUserId(userId)
                .setCourseId(courseId)
                .setReasonText(reasonText)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                return getStubWithAuth(token).refundDecision(request).get();
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            }
        });
    }
}