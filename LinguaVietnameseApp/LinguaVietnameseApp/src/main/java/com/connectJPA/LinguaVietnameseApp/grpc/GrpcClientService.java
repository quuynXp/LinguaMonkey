package com.connectJPA.LinguaVietnameseApp.grpc;

import com.connectJPA.LinguaVietnameseApp.dto.ChatMessageBody;
import com.connectJPA.LinguaVietnameseApp.dto.response.PronunciationResponseBody;
import com.connectJPA.LinguaVietnameseApp.dto.response.WritingResponseBody;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.fasterxml.jackson.databind.ObjectMapper;

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

    private ObjectMapper objectMapper;

    private ManagedChannel createChannelWithToken(String token) {
                return ManagedChannelBuilder.forTarget(grpcTarget.replace("static://", ""))
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

    public CompletableFuture<FindMatchResponse> callFindMatchAsync(
            String token, 
            String userId, 
            CallPreferences userPrefs, 
            List<MatchCandidate> candidates) { // <--- Thêm tham số này
        
        ManagedChannel channel = createChannelWithToken(token);
        LearningServiceGrpc.LearningServiceFutureStub stub = LearningServiceGrpc.newFutureStub(channel);

        FindMatchRequest request = FindMatchRequest.newBuilder()
                .setCurrentUserId(userId)
                .setCurrentUserPrefs(userPrefs)
                .addAllCandidates(candidates) // <--- Gửi list candidates
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

    public void streamPronunciationAsync(
            String token,
            byte[] audioData,
            String language,
            String referenceText,
            String userId,
            String lessonId,
            FluxSink<String> sink) { // <--- THÊM THAM SỐ SINK

        ManagedChannel channel = createChannelWithToken(token);
        LearningServiceGrpc.LearningServiceStub asyncStub = LearningServiceGrpc.newStub(channel);

        // Observer để nhận dữ liệu từ Python trả về
        StreamObserver<PronunciationChunkResponse> responseObserver = new StreamObserver<PronunciationChunkResponse>() {
            @Override
            public void onNext(PronunciationChunkResponse response) {
                try {
                    // Logic mapping data từ Protobuf sang JSON mà Frontend mong đợi
                    Map<String, Object> chunkData = new HashMap<>();
                    
                    // Mapping dựa trên chunk_type từ Python (xem file learning_service.py)
                    String type = response.getChunkType(); // metadata, chunk, suggestion, final, error
                    
                    // Nếu Python không gửi type (do version cũ), tự suy luận
                    if (type == null || type.isEmpty()) {
                        type = response.getIsFinal() ? "final" : "chunk";
                    }

                    chunkData.put("type", type);
                    chunkData.put("feedback", response.getFeedback());

                    // Xử lý các trường hợp cụ thể
                    if ("final".equals(type) || response.getIsFinal()) {
                        chunkData.put("score", response.getScore());
                        // Metadata giả lập nếu Python chưa trả về đủ
                        Map<String, Object> meta = new HashMap<>();
                        meta.put("accuracy_score", response.getScore());
                        meta.put("fluency_score", response.getScore());
                        chunkData.put("metadata", meta);
                    }
                    
                    // Nếu là phân tích từng từ (cần Python trả về cấu trúc chi tiết hơn trong tương lai)
                    // Hiện tại Python trả về text feedback gộp, ta gửi thẳng text đó
                    
                    String jsonChunk = objectMapper.writeValueAsString(chunkData);
                    
                    log.debug("Forwarding chunk to Flux: {}", jsonChunk);
                    sink.next(jsonChunk); // <--- ĐẨY DATA VỀ FRONTEND NGAY LẬP TỨC

                } catch (Exception e) {
                    log.error("Error processing chunk: {}", e.getMessage(), e);
                    sink.error(e);
                }
            }

            @Override
            public void onError(Throwable t) {
                log.error("Stream error from Python: {}", t.getMessage());
                sink.error(t);
                channel.shutdown();
            }

            @Override
            public void onCompleted() {
                log.info("Streaming completed from Python");
                sink.complete(); // <--- Đóng luồng về Frontend
                channel.shutdown();
            }
        };

        // Observer để gửi Audio lên Python
        StreamObserver<PronunciationChunk> requestObserver = asyncStub.streamPronunciation(responseObserver);

        // Logic gửi Audio (giữ nguyên, nhưng bỏ cái CompletableFuture đi vì ta dùng Flux)
        new Thread(() -> {
            try {
                // Chia nhỏ file audio để giả lập streaming (hoặc gửi 1 cục nếu file nhỏ)
                // Python đang join lại nên gửi 1 cục cũng được, nhưng đúng chuẩn là nên chia.
                int chunkSize = 16 * 1024; // 16KB
                int length = audioData.length;
                int offset = 0;
                int sequence = 0;

                while (offset < length) {
                    int end = Math.min(length, offset + chunkSize);
                    byte[] chunkBytes = java.util.Arrays.copyOfRange(audioData, offset, end);
                    
                    PronunciationChunk chunk = PronunciationChunk.newBuilder()
                            .setAudioChunk(com.google.protobuf.ByteString.copyFrom(chunkBytes))
                            .setReferenceText(referenceText) // Chỉ cần gửi ở gói đầu, nhưng gửi hết cũng ko sao
                            .setSequence(sequence++)
                            .setIsFinal(end == length)
                            .build();

                    requestObserver.onNext(chunk);
                    offset = end;
                    Thread.sleep(10); 
                }
                
                requestObserver.onCompleted();

            } catch (Exception e) {
                log.error("Error sending audio to Python: {}", e.getMessage());
                requestObserver.onError(e);
                sink.error(e);
            }
        }).start();
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
                log.error("gRPC call to createOrUpdateRoadmapDetailed failed: {}", e.getMessage(), e); // <-- THÊM LOG
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