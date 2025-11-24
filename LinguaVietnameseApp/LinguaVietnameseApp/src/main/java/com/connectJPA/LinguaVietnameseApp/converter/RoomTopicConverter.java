package com.connectJPA.LinguaVietnameseApp.converter;

import com.connectJPA.LinguaVietnameseApp.enums.RoomTopic;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class RoomTopicConverter implements AttributeConverter<RoomTopic, String> {

    @Override
    public String convertToDatabaseColumn(RoomTopic attribute) {
        if (attribute == null) {
            return null;
        }
        return attribute.name().toLowerCase();
    }

    @Override
    public RoomTopic convertToEntityAttribute(String dbData) {
        if (dbData == null) {
            return null;
        }
        try {
            return RoomTopic.valueOf(dbData.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}