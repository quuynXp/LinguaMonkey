package com.connectJPA.LinguaVietnameseApp.converter;

import com.connectJPA.LinguaVietnameseApp.enums.RoomPurpose;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class RoomPurposeConverter implements AttributeConverter<RoomPurpose, String> {

    @Override
    public String convertToDatabaseColumn(RoomPurpose attribute) {
        if (attribute == null) {
            return null;
        }
        return attribute.name().toLowerCase();
    }

    @Override
    public RoomPurpose convertToEntityAttribute(String dbData) {
        if (dbData == null) {
            return null;
        }
        try {
            return RoomPurpose.valueOf(dbData.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}