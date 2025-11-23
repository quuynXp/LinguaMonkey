package com.connectJPA.LinguaVietnameseApp.service.internal;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import javax.annotation.PostConstruct;
import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class PythonClientService {

    private final ObjectMapper objectMapper;
    private WebClient webClient;

    // Địa chỉ nội bộ của Python Service (Tên service trong render.yaml)
    @Value("${python.service.url:http://pythonservice:8001}") 
    private String pythonServiceBaseUrl;

    private static final String CACHE_INVALIDATION_ENDPOINT = "/internal/invalidate-cache";

    @PostConstruct
    public void init() {
        // Sử dụng WebClient để gọi bất đồng bộ
        this.webClient = WebClient.builder()
                .baseUrl(pythonServiceBaseUrl)
                .build();
        log.info("Initialized WebClient for Python Service at: {}", pythonServiceBaseUrl);
    }

    /**
     * Gửi yêu cầu vô hiệu hóa cache profile người dùng sang Python qua HTTP POST.
     */
    public void sendUserProfileUpdate(String userId, String updatedTable) {
        Map<String, String> payload = new HashMap<>();
        payload.put("user_id", userId);
        payload.put("updated_table", updatedTable);
        payload.put("timestamp", String.valueOf(System.currentTimeMillis()));

        String jsonPayload;
        try {
            jsonPayload = objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize user update event for UserID: {}", userId, e);
            return;
        }

        // Thực hiện HTTP POST call
        webClient.post()
                .uri(CACHE_INVALIDATION_ENDPOINT)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Mono.just(jsonPayload), String.class)
                .retrieve()
                .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(),
                        clientResponse -> clientResponse.bodyToMono(String.class)
                                .flatMap(errorBody -> {
                                    log.error("Error invalidating cache for UserID: {}. Response: {}", userId, errorBody);
                                    return Mono.error(new RuntimeException("Python service error: " + errorBody));
                                }))
                .toBodilessEntity()
                .subscribe(
                        response -> log.info("Successfully requested Python to invalidate cache for UserID: {}", userId),
                        error -> log.error("Failed to connect or received error from Python service: {}", error.getMessage())
                );
    }
}