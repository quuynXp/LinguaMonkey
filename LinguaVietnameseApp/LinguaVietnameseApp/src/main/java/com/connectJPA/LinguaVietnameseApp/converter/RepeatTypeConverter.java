package com.connectJPA.LinguaVietnameseApp.converter;

import com.connectJPA.LinguaVietnameseApp.enums.RepeatType;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class RepeatTypeConverter implements AttributeConverter<RepeatType, String> {

    @Override
    public String convertToDatabaseColumn(RepeatType attribute) {
        if (attribute == null) {
            return null;
        }
        return attribute.name().toLowerCase();
    }

    @Override
    public RepeatType convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isEmpty()) {
            return null;
        }
        try {
            return RepeatType.valueOf(dbData.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}