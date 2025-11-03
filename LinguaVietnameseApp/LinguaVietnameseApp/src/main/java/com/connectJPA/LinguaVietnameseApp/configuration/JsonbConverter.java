package com.connectJPA.LinguaVietnameseApp.configuration;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Converter
@Slf4j
@RequiredArgsConstructor
public class JsonbConverter implements AttributeConverter<Object, String> {

    private final ObjectMapper objectMapper; // Spring Boot tự động inject

    @Override
    public String convertToDatabaseColumn(Object attribute) {
        if (attribute == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(attribute);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize attribute to JSONB: {}", attribute, e);
            throw new RuntimeException("JSONB serialization error", e);
        }
    }

    @Override
    public Object convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return null;
        }
        try {
            // Chúng ta có thể trả về Object.class hoặc một Map.class
            return objectMapper.readValue(dbData, Object.class);
        } catch (JsonProcessingException e) {
            log.error("Failed to deserialize JSONB to Object: {}", dbData, e);
            throw new RuntimeException("JSONB deserialization error", e);
        }
    }
}