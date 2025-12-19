package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.service.CurrencyService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicReference;

@Service
@RequiredArgsConstructor
@Slf4j
public class CurrencyServiceImpl implements CurrencyService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    private static final String EXCHANGE_RATE_API = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json";
    private static final long CACHE_DURATION_SECONDS = 3600; // 1 hour

    private final AtomicReference<BigDecimal> cachedRate = new AtomicReference<>(new BigDecimal("25400"));
    private final AtomicReference<Instant> lastFetchTime = new AtomicReference<>(Instant.MIN);

    @Override
    public BigDecimal getUsdToVndRate() {
        if (isCacheExpired()) {
            fetchAndUpdateRate();
        }
        return cachedRate.get();
    }

    private boolean isCacheExpired() {
        return Instant.now().minusSeconds(CACHE_DURATION_SECONDS).isAfter(lastFetchTime.get());
    }

    private void fetchAndUpdateRate() {
        try {
            String jsonResponse = restTemplate.getForObject(EXCHANGE_RATE_API, String.class);
            if (jsonResponse != null) {
                JsonNode root = objectMapper.readTree(jsonResponse);
                double rate = root.path("usd").path("vnd").asDouble();
                
                if (rate > 0) {
                    cachedRate.set(BigDecimal.valueOf(rate));
                    lastFetchTime.set(Instant.now());
                    log.info("Updated USD/VND rate: {}", rate);
                }
            }
        } catch (Exception e) {
            log.error("Failed to fetch exchange rate, keeping old rate: {}", cachedRate.get());
        }
    }

    @PostConstruct
    public void init() {
        fetchAndUpdateRate();
    }
}