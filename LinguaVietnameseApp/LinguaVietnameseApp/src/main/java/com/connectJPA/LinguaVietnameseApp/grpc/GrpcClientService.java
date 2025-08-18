package com.connectJPA.LinguaVietnameseApp.grpc;

import com.connectJPA.LinguaVietnameseApp.dto.ChatMessageBody;
import com.connectJPA.LinguaVietnameseApp.dto.response.PronunciationResponseBody;
import com.connectJPA.LinguaVietnameseApp.dto.response.WritingResponseBody;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.Metadata;
import io.grpc.stub.MetadataUtils;
import learning.LearningServiceGrpc;
import learning.LearningServiceOuterClass.*;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
public class GrpcClientService {

    private final String grpcServerAddress = "localhost";
    private final int grpcServerPort = 50051;

    private ManagedChannel createChannelWithToken(String token) {
        return ManagedChannelBuilder.forAddress(grpcServerAddress, grpcServerPort)
                .usePlaintext()
                .intercept(new GrpcAuthInterceptor(token))
                .build();
    }

    public CompletableFuture<String> callSpeechToTextAsync(String token, byte[] audioData, String language) {
        ManagedChannel channel = createChannelWithToken(token);
        LearningServiceGrpc.LearningServiceFutureStub stub = LearningServiceGrpc.newFutureStub(channel);

        SpeechRequest request = SpeechRequest.newBuilder()
                .setAudioData(com.google.protobuf.ByteString.copyFrom(audioData))
                .setLanguage(language)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                SpeechResponse response = stub.speechToText(request).get();
                if (!response.getError().isEmpty()) {
                    throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
                }
                return response.getText();
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
                .addAllHistory(history.stream().map(h -> ChatMessage.newBuilder()
                                .setRole(h.getRole())
                                .setContent(h.getContent())
                                .build())
                        .collect(Collectors.toList()))
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                ChatResponse response = stub.chatWithAI(request).get();
                if (!response.getError().isEmpty()) {
                    throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
                }
                return response.getResponse();
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            } finally {
                channel.shutdown();
            }
        });
    }

    public CompletableFuture<List<String>> callCheckSpellingAsync(String token, String text, String language) {
        ManagedChannel channel = createChannelWithToken(token);
        LearningServiceGrpc.LearningServiceFutureStub stub = LearningServiceGrpc.newFutureStub(channel);

        SpellingRequest request = SpellingRequest.newBuilder()
                .setText(text)
                .setLanguage(language)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                SpellingResponse response = stub.checkSpelling(request).get();
                if (!response.getError().isEmpty()) {
                    throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
                }
                return response.getCorrectionsList();
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            } finally {
                channel.shutdown();
            }
        });
    }

    public CompletableFuture<PronunciationResponseBody> callCheckPronunciationAsync(String token, byte[] audioData, String language) {
        ManagedChannel channel = createChannelWithToken(token);
        LearningServiceGrpc.LearningServiceFutureStub stub = LearningServiceGrpc.newFutureStub(channel);

        PronunciationRequest request = PronunciationRequest.newBuilder()
                .setAudioData(com.google.protobuf.ByteString.copyFrom(audioData))
                .setLanguage(language)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                PronunciationResponse response = stub.checkPronunciation(request).get();
                if (!response.getError().isEmpty()) {
                    throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
                }
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

    public CompletableFuture<WritingResponseBody> callCheckWritingWithImageAsync(String token, String text, byte[] imageData) {
        ManagedChannel channel = createChannelWithToken(token);
        LearningServiceGrpc.LearningServiceFutureStub stub = LearningServiceGrpc.newFutureStub(channel);

        WritingImageRequest.Builder requestBuilder = WritingImageRequest.newBuilder()
                .setText(text);
        if (imageData != null) {
            requestBuilder.setImageData(com.google.protobuf.ByteString.copyFrom(imageData));
        }

        return CompletableFuture.supplyAsync(() -> {
            try {
                WritingImageResponse response = stub.checkWritingWithImage(requestBuilder.build()).get();
                if (!response.getError().isEmpty()) {
                    throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
                }
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

    public CompletableFuture<String> callGeneratePassageAsync(String token, String userId, String language) {
        ManagedChannel channel = createChannelWithToken(token);
        LearningServiceGrpc.LearningServiceFutureStub stub = LearningServiceGrpc.newFutureStub(channel);

        GeneratePassageRequest request = GeneratePassageRequest.newBuilder()
                .setUserId(userId)
                .setLanguage(language)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                GeneratePassageResponse response = stub.generatePassage(request).get();
                if (!response.getError().isEmpty()) {
                    throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
                }
                return response.getPassage();
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            } finally {
                channel.shutdown();
            }
        });
    }

    public CompletableFuture<byte[]> callGenerateImageAsync(String token, String userId, String language) {
        ManagedChannel channel = createChannelWithToken(token);
        LearningServiceGrpc.LearningServiceFutureStub stub = LearningServiceGrpc.newFutureStub(channel);

        GenerateImageRequest request = GenerateImageRequest.newBuilder()
                .setUserId(userId)
                .setLanguage(language)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                GenerateImageResponse response = stub.generateImage(request).get();
                if (!response.getError().isEmpty()) {
                    throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
                }
                return response.getImageData().toByteArray();
            } catch (Exception e) {
                throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
            } finally {
                channel.shutdown();
            }
        });
    }

    public CompletableFuture<String> callGenerateTextAsync(String token, String userId, String language) {
        ManagedChannel channel = createChannelWithToken(token);
        LearningServiceGrpc.LearningServiceFutureStub stub = LearningServiceGrpc.newFutureStub(channel);

        GenerateTextRequest request = GenerateTextRequest.newBuilder()
                .setUserId(userId)
                .setLanguage(language)
                .build();

        return CompletableFuture.supplyAsync(() -> {
            try {
                GenerateTextResponse response = stub.generateText(request).get();
                if (!response.getError().isEmpty()) {
                    throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
                }
                return response.getText();
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
                if (!response.getError().isEmpty()) {
                    throw new AppException(ErrorCode.AI_PROCESSING_FAILED);
                }
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
}