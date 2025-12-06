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
import io.grpc.StatusRuntimeException;
import io.grpc.stub.StreamObserver;
import learning.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.FluxSink;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GrpcClientService {

    @Value("${grpc.client.learning-service.address}")
    private String grpcTarget;

    private final ObjectMapper objectMapper;

    private ManagedChannel createChannelWithToken(String token) {
        log.debug("Creating gRPC channel to: {}", grpcTarget);
        // Remove protocol prefix if present
        String target = grpcTarget.replace("static://", "").replace("http://", "");
        return ManagedChannelBuilder.forTarget(target)
                .usePlaintext()
                .intercept(new GrpcAuthInterceptor(token))
                .build();
    }

    // --- TRANSLATE (Optimized for Chat) ---
    public CompletableFuture<TranslateResponse> callTranslateAsync(String token, String text, String sourceLang, String targetLang) {
        ManagedChannel channel = createChannelWithToken(token);
        LearningServiceGrpc.LearningServiceFutureStub stub = LearningServiceGrpc.newFutureStub(channel);

        TranslateRequest request = TranslateRequest.newBuilder()
                .setText(text == null ? "" : text)
                .setSourceLanguage(sourceLang == null ? "auto" : sourceLang)
                .setTargetLanguage(targetLang == null ? "vi" : targetLang)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                // Calls Python (which uses Redis + Gemini)
                TranslateResponse response = stub.translate(request).get();
                
                if (response == null || !response.getError().isEmpty()) {
                    log.warn("Translation partial error from Python: {}", response != null ? response.getError() : "null response");
                }
                return response;
            } catch (Exception e) {
                log.error("gRPC Translate Failed: {}", e.getMessage());
                // Fallback: return original text to avoid breaking chat flow
                return TranslateResponse.newBuilder()
                        .setTranslatedText(text) 
                        .setSourceLanguageDetected(sourceLang != null ? sourceLang : "unknown")
                        .setError("Service unavailable")
                        .build();
            } finally {
                channel.shutdown();
            }
        });
    }

    // --- WRITING & MEDIA ASSESSMENT (Updated for Image/Video/Audio) ---

    public CompletableFuture<WritingResponseBody> callCheckWritingAssessmentAsync(
            String token, String userText, String prompt, 
            byte[] mediaData, String mediaUrl, String mediaType) {
        
        ManagedChannel channel = createChannelWithToken(token);
        LearningServiceGrpc.LearningServiceFutureStub stub = LearningServiceGrpc.newFutureStub(channel);

        // Build request with new Proto message
        WritingAssessmentRequest.Builder requestBuilder = WritingAssessmentRequest.newBuilder()
                .setUserText(userText)
                .setPrompt(prompt)
                .setMediaType(mediaType != null ? mediaType : "text/plain")
                .setLanguage("en"); // Default or pass as arg

        // Handle Media: Priority to Inline Data (User Upload), then URL (Existing Question Media)
        if (mediaData != null && mediaData.length > 0) {
            requestBuilder.setMedia(MediaRef.newBuilder().setInlineData(ByteString.copyFrom(mediaData)));
        } else if (mediaUrl != null && !mediaUrl.isEmpty()) {
            requestBuilder.setMedia(MediaRef.newBuilder().setUrl(mediaUrl));
        }

        return CompletableFuture.supplyAsync(() -> {
            try {
                WritingAssessmentResponse response = stub.checkWritingAssessment(requestBuilder.build()).get();
                if (!response.getError().isEmpty()) throw new AppException(ErrorCode.AI_PROCESSING_FAILED);

                WritingResponseBody result = new WritingResponseBody();
                result.setFeedback(response.getFeedback());
                result.setScore(response.getScore());
                return result;
            } catch (Exception e) {
                log.error("gRPC CheckWritingAssessment failed", e);
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            } finally {
                channel.shutdown();
            }
        });
    }

    // --- OTHER METHODS ---

    public CompletableFuture<SeedDataResponse> callGenerateSeedDataAsync(
            String token, 
            String rawQuestion, 
            List<String> rawOptions, 
            String topic) {
        
        ManagedChannel channel = createChannelWithToken(token);
        LearningServiceGrpc.LearningServiceFutureStub stub = LearningServiceGrpc.newFutureStub(channel);

        SeedDataRequest request = SeedDataRequest.newBuilder()
                .setRawQuestion(rawQuestion == null ? "" : rawQuestion)
                .addAllRawOptions(rawOptions)
                .setTopic(topic == null ? "" : topic)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                SeedDataResponse response = stub.generateSeedData(request).get();
                if (!response.getError().isEmpty()) {
                    log.error("Seed generation error from Python: {}", response.getError());
                    throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
                }
                return response;
            } catch (Exception e) {
                log.error("gRPC call generateSeedData failed", e);
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            } finally {
                channel.shutdown();
            }
        });
    }

    public CompletableFuture<GenerateImageResponse> callGenerateImageAsync(String token, String userId, String prompt, String language) {
        ManagedChannel channel = createChannelWithToken(token);
        LearningServiceGrpc.LearningServiceFutureStub stub = LearningServiceGrpc.newFutureStub(channel);

        GenerateImageRequest request = GenerateImageRequest.newBuilder()
                .setUserId(userId)
                .setPrompt(prompt)
                .setLanguage(language)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                GenerateImageResponse response = stub.generateImage(request).get();
                if (!response.getError().isEmpty()) throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
                return response;
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            } finally {
                channel.shutdown();
            }
        });
    }

    public CompletableFuture<CourseEvaluationResponse> callEvaluateCourseVersionAsync(
            String token, 
            String courseTitle, 
            String courseDescription, 
            List<Lesson> lessons) {
        
        ManagedChannel channel = createChannelWithToken(token);
        LearningServiceGrpc.LearningServiceFutureStub stub = LearningServiceGrpc.newFutureStub(channel);

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
                EvaluateCourseVersionResponse response = stub.evaluateCourseVersion(request).get();
                if (!response.getError().isEmpty()) {
                    throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
                }
                return CourseEvaluationResponse.builder()
                        .rating(response.getRating())
                        .reviewComment(response.getReviewComment())
                        .build();
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            } finally {
                channel.shutdown();
            }
        });
    }

    public CompletableFuture<FindMatchResponse> callFindMatchAsync(
            String token, 
            String userId, 
            CallPreferences userPrefs, 
            List<MatchCandidate> candidates) {
        
        ManagedChannel channel = createChannelWithToken(token);
        LearningServiceGrpc.LearningServiceFutureStub stub = LearningServiceGrpc.newFutureStub(channel);

        FindMatchRequest request = FindMatchRequest.newBuilder()
                .setCurrentUserId(userId)
                .setCurrentUserPrefs(userPrefs)
                .addAllCandidates(candidates)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                return stub.findMatch(request).get();
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            } finally {
                channel.shutdown();
            }
        });
    }

    public CompletableFuture<ReviewQualityResponse> callAnalyzeReviewQualityAsync(String token, String userId, String contentId, String content, float rating, String contentType) {
        ManagedChannel channel = createChannelWithToken(token);
        LearningServiceGrpc.LearningServiceFutureStub stub = LearningServiceGrpc.newFutureStub(channel);

        ReviewQualityRequest request = ReviewQualityRequest.newBuilder()
                .setUserId(userId)
                .setContentId(contentId)
                .setReviewText(content)
                .setRating(rating)
                .setContentType(contentType)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                learning.ReviewQualityResponse response = stub.analyzeReviewQuality(request).get();
                if (!response.getError().isEmpty()) {
                    throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
                }
                
                return ReviewQualityResponse.builder()
                        .isValid(response.getIsValid())
                        .isToxic(response.getIsToxic()) 
                        .sentiment(response.getSentiment())
                        .topics(response.getTopicsList())
                        .suggestedAction(response.getSuggestedAction())
                        .build();
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            } finally {
                channel.shutdown();
            }
        });
    }

    public CompletableFuture<QuizGenerationResponse> generateLanguageQuiz(String token, String userId, int numQuestions, String mode, String topic) {
        ManagedChannel channel = createChannelWithToken(token);
        LearningServiceGrpc.LearningServiceFutureStub stub = LearningServiceGrpc.newFutureStub(channel);

        QuizGenerationRequest.Builder requestBuilder = QuizGenerationRequest.newBuilder()
                .setNumQuestions(numQuestions)
                .setMode(mode);

        if (userId != null && !userId.isBlank()) {
            requestBuilder.setUserId(userId);
        }
        if (topic != null && !topic.isBlank()) {
            requestBuilder.setTopic(topic);
        }

        return CompletableFuture.supplyAsync(() -> {
            try {
                QuizGenerationResponse response = stub.generateLanguageQuiz(requestBuilder.build()).get();
                if (response == null || !response.getError().isEmpty()) {
                    throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
                }
                return response;
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            } finally {
                channel.shutdown();
            }
        });
    }

    public CompletableFuture<String> callSpeechToTextAsync(String token, byte[] audioData, String language) {
        ManagedChannel channel = createChannelWithToken(token);
        LearningServiceGrpc.LearningServiceFutureStub stub = LearningServiceGrpc.newFutureStub(channel);

        SpeechRequest request = SpeechRequest.newBuilder()
                .setAudio(MediaRef.newBuilder().setInlineData(ByteString.copyFrom(audioData)))
                .setLanguage(language)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                SpeechResponse response = stub.speechToText(request).get();
                if (!response.getError().isEmpty()) throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
                return response.getText();
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            } finally {
                channel.shutdown();
            }
        });
    }

    public CompletableFuture<byte[]> callGenerateTtsAsync(String token, String text, String language) {
        ManagedChannel channel = createChannelWithToken(token);
        LearningServiceGrpc.LearningServiceFutureStub stub = LearningServiceGrpc.newFutureStub(channel);

        TtsRequest request = TtsRequest.newBuilder().setText(text).setLanguage(language).build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                TtsResponse response = stub.generateTts(request).get();
                if (!response.getError().isEmpty()) throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
                return response.getAudioData().toByteArray();
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            } finally {
                channel.shutdown();
            }
        });
    }

    public CompletableFuture<PronunciationResponseBody> callCheckPronunciationAsync(
            String token, byte[] audioData, String language, String referenceText) {
        
        ManagedChannel channel = createChannelWithToken(token);
        LearningServiceGrpc.LearningServiceFutureStub stub = LearningServiceGrpc.newFutureStub(channel);

        PronunciationRequest request = PronunciationRequest.newBuilder()
                .setAudio(MediaRef.newBuilder().setInlineData(ByteString.copyFrom(audioData)))
                .setLanguage(language)
                .setReferenceText(referenceText)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                PronunciationResponse response = stub.checkPronunciation(request).get();
                if (!response.getError().isEmpty()) throw new AppException(ErrorCode.AI_PROCESSING_FAILED);

                PronunciationResponseBody result = new PronunciationResponseBody();
                result.setFeedback(response.getFeedback());
                result.setScore(response.getScore());
                return result;
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            } finally {
                channel.shutdown();
            }
        });
    }

    public void streamPronunciationAsync(
            String token, byte[] audioData, String language, String referenceText,
            String userId, String lessonQuestionId, FluxSink<String> sink) {

        ManagedChannel channel = createChannelWithToken(token);
        LearningServiceGrpc.LearningServiceStub asyncStub = LearningServiceGrpc.newStub(channel);

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
                channel.shutdown();
            }

            @Override
            public void onCompleted() {
                sink.complete();
                channel.shutdown();
            }
        };

        StreamObserver<PronunciationChunk> requestObserver = asyncStub.streamPronunciation(responseObserver);

        new Thread(() -> {
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
                    
                    if (seq == 1) {
                        chunkBuilder.setReferenceText(referenceText);
                    }

                    requestObserver.onNext(chunkBuilder.build());
                    offset = end;
                    Thread.sleep(10); 
                }
                requestObserver.onCompleted();
            } catch (Exception e) {
                requestObserver.onError(e);
            }
        }).start();
    }

    public CompletableFuture<List<String>> callCheckSpellingAsync(String token, String text, String language) {
        ManagedChannel channel = createChannelWithToken(token);
        LearningServiceGrpc.LearningServiceFutureStub stub = LearningServiceGrpc.newFutureStub(channel);
        SpellingRequest request = SpellingRequest.newBuilder().setText(text).setLanguage(language).build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                SpellingResponse response = stub.checkSpelling(request).get();
                if (!response.getError().isEmpty()) throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
                return response.getCorrectionsList();
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            } finally {
                channel.shutdown();
            }
        });
    }

    public CompletableFuture<String> callChatWithAIAsync(String token, String userId, String message, List<ChatMessageBody> history) {
        ManagedChannel channel = createChannelWithToken(token);
        LearningServiceGrpc.LearningServiceFutureStub stub = LearningServiceGrpc.newFutureStub(channel);

        ChatRequest request = ChatRequest.newBuilder()
                .setUserId(userId)
                .setMessage(message)
                .addAllHistory(history.stream()
                        .map(h -> ChatMessage.newBuilder().setRole(h.getRole()).setContent(h.getContent()).build())
                        .collect(Collectors.toList()))
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                ChatResponse response = stub.chatWithAI(request).get();
                if (!response.getError().isEmpty()) throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
                return response.getResponse();
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            } finally {
                channel.shutdown();
            }
        });
    }

    public CompletableFuture<WritingResponseBody> callCheckTranslationAsync(String token, String referenceText, String translatedText, String targetLanguage) {
        ManagedChannel channel = createChannelWithToken(token);
        LearningServiceGrpc.LearningServiceFutureStub stub = LearningServiceGrpc.newFutureStub(channel);

        CheckTranslationRequest request = CheckTranslationRequest.newBuilder()
                .setReferenceText(referenceText)
                .setTranslatedText(translatedText)
                .setTargetLanguage(targetLanguage)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                CheckTranslationResponse response = stub.checkTranslation(request).get();
                if (!response.getError().isEmpty()) throw new AppException(ErrorCode.AI_PROCESSING_FAILED);

                WritingResponseBody result = new WritingResponseBody();
                result.setFeedback(response.getFeedback());
                result.setScore(response.getScore());
                return result;
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            } finally {
                channel.shutdown();
            }
        });
    }

    public CompletableFuture<String> callGenerateTextAsync(String token, String userId, String prompt, String language) {
        ManagedChannel channel = createChannelWithToken(token);
        LearningServiceGrpc.LearningServiceFutureStub stub = LearningServiceGrpc.newFutureStub(channel);
        GenerateTextRequest request = GenerateTextRequest.newBuilder()
                .setUserId(userId)
                .setPrompt(prompt)
                .setLanguage(language)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                GenerateTextResponse response = stub.generateText(request).get();
                if (!response.getError().isEmpty()) throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
                return response.getText();
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            } finally {
                channel.shutdown();
            }
        });
    }

    public CompletableFuture<String> callGeneratePassageAsync(String token, String userId, String topic, String language) {
        ManagedChannel channel = createChannelWithToken(token);
        LearningServiceGrpc.LearningServiceFutureStub stub = LearningServiceGrpc.newFutureStub(channel);
        GeneratePassageRequest request = GeneratePassageRequest.newBuilder()
                .setUserId(userId)
                .setTopic(topic)
                .setLanguage(language)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                GeneratePassageResponse response = stub.generatePassage(request).get();
                if (!response.getError().isEmpty()) throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
                return response.getPassage();
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            } finally {
                channel.shutdown();
            }
        });
    }

    public CompletableFuture<RoadmapResponse> callCreateOrUpdateRoadmapAsync(String token, String userId, String roadmapId, String title, String description, String language) {
        ManagedChannel channel = createChannelWithToken(token);
        LearningServiceGrpc.LearningServiceFutureStub stub = LearningServiceGrpc.newFutureStub(channel);

        RoadmapRequest request = RoadmapRequest.newBuilder()
                .setUserId(userId)
                .setRoadmapId(roadmapId)
                .setTitle(title)
                .setDescription(description)
                .setLanguage(language)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                RoadmapResponse response = stub.createOrUpdateRoadmap(request).get();
                if (!response.getError().isEmpty()) throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
                return response;
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            } finally {
                channel.shutdown();
            }
        });
    }

    public CompletableFuture<RoadmapDetailedResponse> callCreateOrUpdateRoadmapDetailedAsync(String token, String userId, String roadmapId, String language, String prompt, boolean asUserSpecific) {
        ManagedChannel channel = createChannelWithToken(token);
        LearningServiceGrpc.LearningServiceFutureStub stub = LearningServiceGrpc.newFutureStub(channel);

        RoadmapDetailedRequest request = RoadmapDetailedRequest.newBuilder()
                .setUserId(userId)
                .setRoadmapId(roadmapId)
                .setLanguage(language)
                .setPrompt(prompt)
                .setAsUserSpecific(asUserSpecific)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                RoadmapDetailedResponse response = stub.createOrUpdateRoadmapDetailed(request).get();
                if (!response.getError().isEmpty()) throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
                return response;
            } catch (Exception e) {
                log.error("gRPC call to createOrUpdateRoadmapDetailed failed", e);
                if (e.getCause() instanceof StatusRuntimeException sre) {
                    throw new AppException(ErrorCode.GRPC_SERVICE_ERROR);
                }
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            } finally {
                channel.shutdown();
            }
        });
    }

    public CompletableFuture<CourseQualityResponse> callAnalyzeCourseQualityAsync(String token, String courseId, List<String> lessonIds) {
        ManagedChannel channel = createChannelWithToken(token);
        LearningServiceGrpc.LearningServiceFutureStub stub = LearningServiceGrpc.newFutureStub(channel);

        CourseQualityRequest request = CourseQualityRequest.newBuilder()
                .setCourseId(courseId)
                .addAllLessonIds(lessonIds)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                CourseQualityResponse response = stub.analyzeCourseQuality(request).get();
                if (!response.getError().isEmpty()) throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
                return response;
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            } finally {
                channel.shutdown();
            }
        });
    }

    public CompletableFuture<RefundDecisionResponse> callRefundDecisionAsync(String token, String transactionId, String userId, String courseId, String reasonText) {
        ManagedChannel channel = createChannelWithToken(token);
        LearningServiceGrpc.LearningServiceFutureStub stub = LearningServiceGrpc.newFutureStub(channel);

        RefundDecisionRequest request = RefundDecisionRequest.newBuilder()
                .setTransactionId(transactionId)
                .setUserId(userId)
                .setCourseId(courseId)
                .setReasonText(reasonText)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                RefundDecisionResponse response = stub.refundDecision(request).get();
                if (!response.getError().isEmpty()) throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
                return response;
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            } finally {
                channel.shutdown();
            }
        });
    }
}