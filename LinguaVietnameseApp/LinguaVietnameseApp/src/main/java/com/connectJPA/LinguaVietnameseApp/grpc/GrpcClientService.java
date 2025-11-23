package com.connectJPA.LinguaVietnameseApp.grpc;

import com.connectJPA.LinguaVietnameseApp.dto.ChatMessageBody;
import com.connectJPA.LinguaVietnameseApp.dto.response.PronunciationResponseBody;
import com.connectJPA.LinguaVietnameseApp.dto.response.WritingResponseBody;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.StatusRuntimeException;
import io.grpc.stub.StreamObserver;
import learning.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GrpcClientService {

    @Value("${grpc.server.host}")
    private String grpcServerAddress;

    @Value("${grpc.server.port}")
    private int grpcServerPort;

    private ManagedChannel createChannelWithToken(String token) {
        return ManagedChannelBuilder.forAddress(grpcServerAddress, grpcServerPort)
                .usePlaintext()
                .intercept(new GrpcAuthInterceptor(token))
                .build();
    }

    public CompletableFuture<TranslateResponse> callTranslateAsync(String token, String text, String sourceLang, String targetLang) {
        ManagedChannel channel = createChannelWithToken(token);
        LearningServiceGrpc.LearningServiceFutureStub stub = LearningServiceGrpc.newFutureStub(channel);

        TranslateRequest request = TranslateRequest.newBuilder()
                .setText(text == null ? "" : text)
                .setSourceLanguage(sourceLang == null ? "" : sourceLang)
                .setTargetLanguage(targetLang == null ? "" : targetLang)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                TranslateResponse response = stub.translate(request).get();
                if (response == null || !response.getError().isEmpty())
                    throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
                return response;
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            } finally {
                channel.shutdown();
            }
        });
    }

    public CompletableFuture<FindMatchResponse> callFindMatchAsync(String token, String userId, CallPreferences preferences) {
        ManagedChannel channel = createChannelWithToken(token);
        LearningServiceGrpc.LearningServiceFutureStub stub = LearningServiceGrpc.newFutureStub(channel);

        FindMatchRequest request = FindMatchRequest.newBuilder()
                .setUserId(userId)
                .setPreferences(preferences)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                FindMatchResponse response = stub.findMatch(request).get();
                if (response == null || !response.getError().isEmpty()) {
                    log.error("gRPC FindMatch failed: {}", response.getError());
                    throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
                }
                return response;
            } catch (Exception e) {
                log.error("gRPC call to FindMatch failed: {}", e.getMessage());
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
                ReviewQualityResponse response = stub.analyzeReviewQuality(request).get();
                if (!response.getError().isEmpty()) {
                    log.error("AI review analysis failed: {}", response.getError());
                    throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
                }
                return response;
            } catch (Exception e) {
                log.error("gRPC call to analyzeReviewQuality failed: {}", e.getMessage());
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

        QuizGenerationRequest request = requestBuilder.build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                QuizGenerationResponse response = stub.generateLanguageQuiz(request).get();
                if (response == null || !response.getError().isEmpty()) {
                    log.error("gRPC Quiz Generation failed with error: {}", response != null ? response.getError() : "NULL RESPONSE");
                    throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
                }
                return response;
            } catch (Exception e) {
                log.error("gRPC call to generateLanguageQuiz failed: {}", e.getMessage());
                if (e.getCause() instanceof StatusRuntimeException sre) {
                    log.error("gRPC StatusRuntimeException details: {}", sre.getStatus());
                    throw new AppException(ErrorCode.GRPC_SERVICE_ERROR);
                }
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
                .setAudio(MediaRef.newBuilder().setInlineData(com.google.protobuf.ByteString.copyFrom(audioData)))
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

    public CompletableFuture<PronunciationResponseBody> callCheckPronunciationAsync(String token, byte[] audioData, String language, String referenceText) {
        ManagedChannel channel = createChannelWithToken(token);
        LearningServiceGrpc.LearningServiceFutureStub stub = LearningServiceGrpc.newFutureStub(channel);

        PronunciationRequest request = PronunciationRequest.newBuilder()
                .setAudio(MediaRef.newBuilder().setInlineData(com.google.protobuf.ByteString.copyFrom(audioData)))
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

    public CompletableFuture<Void> streamPronunciationAsync(
            String token,
            byte[] audioData,
            String language,
            String referenceText,
            String userId,
            String lessonId) {

        ManagedChannel channel = createChannelWithToken(token);
        LearningServiceGrpc.LearningServiceStub asyncStub = LearningServiceGrpc.newStub(channel);

        return CompletableFuture.supplyAsync(() -> {
            try {
                final boolean[] completed = {false};
                final Exception[] streamError = {null};

                StreamObserver<PronunciationChunkResponse> responseObserver =
                        new StreamObserver<PronunciationChunkResponse>() {
                            @Override
                            public void onNext(PronunciationChunkResponse response) {
                                try {
                                    log.debug("Received pronunciation chunk: type={}, score={}, feedback={}",
                                            response.getChunkType(),
                                            response.getScore(),
                                            response.getFeedback());
                                    forwardChunkToClients(lessonId, response);
                                } catch (Exception e) {
                                    log.error("Error processing chunk: {}", e.getMessage(), e);
                                }
                            }

                            @Override
                            public void onError(Throwable t) {
                                log.error("Stream error: {}", t.getMessage(), t);
                                streamError[0] = new Exception(t);
                                completed[0] = true;
                            }

                            @Override
                            public void onCompleted() {
                                log.info("Streaming completed");
                                completed[0] = true;
                            }
                        };

                StreamObserver<PronunciationChunk> requestObserver =
                        asyncStub.streamPronunciation(responseObserver);

                try {
                    PronunciationChunk chunk = PronunciationChunk.newBuilder()
                            .setAudioChunk(com.google.protobuf.ByteString.copyFrom(audioData))
                            .setReferenceText(referenceText)
                            .setSequence(0)
                            .setIsFinal(true)
                            .build();

                    log.info("Sending pronunciation chunk: size={}, referenceText={}, userId={}",
                            audioData.length,
                            referenceText,
                            userId);

                    requestObserver.onNext(chunk);
                    requestObserver.onCompleted();

                    long startTime = System.currentTimeMillis();
                    while (!completed[0] && System.currentTimeMillis() - startTime < 30000) {
                        Thread.sleep(100);
                    }

                    if (streamError[0] != null) {
                        throw new RuntimeException(streamError[0]);
                    }

                    log.info("Stream completed successfully");
                    return null;

                } catch (Exception e) {
                    log.error("Error during streaming: {}", e.getMessage(), e);
                    requestObserver.onError(e);
                    throw new RuntimeException(e);
                }

            } finally {
                channel.shutdown();
            }
        }).handle((result, exception) -> {
            if (exception != null) {
                log.error("Fatal streaming error: {}", exception.getMessage(), exception);
                throw new AppException(ErrorCode.GRPC_SERVICE_ERROR);
            }
            return null;
        });
    }

    private void forwardChunkToClients(String lessonId, PronunciationChunkResponse response) {
        log.debug("Forwarding chunk to clients: lessonId={}", lessonId);
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

    public CompletableFuture<WritingResponseBody> callCheckWritingWithImageAsync(String token, String text, byte[] imageData) {
        ManagedChannel channel = createChannelWithToken(token);
        LearningServiceGrpc.LearningServiceFutureStub stub = LearningServiceGrpc.newFutureStub(channel);

        WritingImageRequest request = WritingImageRequest.newBuilder()
                .setText(text)
                .setImage(MediaRef.newBuilder().setInlineData(com.google.protobuf.ByteString.copyFrom(imageData)))
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                WritingImageResponse response = stub.checkWritingWithImage(request).get();
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