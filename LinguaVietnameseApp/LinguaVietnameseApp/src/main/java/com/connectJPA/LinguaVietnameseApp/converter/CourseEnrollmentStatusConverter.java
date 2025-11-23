package com.connectJPA.LinguaVietnameseApp.converter;

import com.connectJPA.LinguaVietnameseApp.enums.CourseEnrollmentStatus;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class CourseEnrollmentStatusConverter implements AttributeConverter<CourseEnrollmentStatus, String> {

    @Override
    public String convertToDatabaseColumn(CourseEnrollmentStatus status) {
        if (status == null) {
            return null;
        }
        return status.name().toLowerCase();
    }

    @Override
    public CourseEnrollmentStatus convertToEntityAttribute(String dbData) {
        if (dbData == null) {
            return null;
        }
        try {
            return CourseEnrollmentStatus.valueOf(dbData.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}