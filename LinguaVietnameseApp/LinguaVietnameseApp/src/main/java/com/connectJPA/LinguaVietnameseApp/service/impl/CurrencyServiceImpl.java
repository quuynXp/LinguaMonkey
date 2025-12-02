package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.service.CurrencyService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
@Slf4j
public class CurrencyServiceImpl implements CurrencyService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    private static final String EXCHANGE_RATE_API = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json";

    @Override
    @Cacheable("exchangeRates") 
    public BigDecimal getUsdToVndRate() {
        try {
            String jsonResponse = restTemplate.getForObject(EXCHANGE_RATE_API, String.class);
            JsonNode root = objectMapper.readTree(jsonResponse);
            double rate = root.path("usd").path("vnd").asDouble();
            
            if (rate <= 0) return new BigDecimal("25400");
            
            log.info("Fetched live USD/VND rate: {}", rate);
            return BigDecimal.valueOf(rate);
        } catch (Exception e) {
            log.error("Failed to fetch exchange rate, using fallback. Error: {}", e.getMessage());
            return new BigDecimal("25400");
        }
    }
}