package com.connectJPA.LinguaVietnameseApp.converter;

import com.connectJPA.LinguaVietnameseApp.enums.GoalType;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class GoalTypeConverter implements AttributeConverter<GoalType, String> {

    @Override
    public String convertToDatabaseColumn(GoalType attribute) {
        if (attribute == null) {
            return null;
        }
        return attribute.name().toLowerCase();
    }

    @Override
    public GoalType convertToEntityAttribute(String dbData) {
        if (dbData == null) {
            return null;
        }
        try {
            return GoalType.valueOf(dbData.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}