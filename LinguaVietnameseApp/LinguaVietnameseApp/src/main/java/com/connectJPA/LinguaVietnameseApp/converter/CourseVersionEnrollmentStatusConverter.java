package com.connectJPA.LinguaVietnameseApp.converter;

import com.connectJPA.LinguaVietnameseApp.enums.CourseVersionEnrollmentStatus;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class CourseVersionEnrollmentStatusConverter implements AttributeConverter<CourseVersionEnrollmentStatus, String> {

    @Override
    public String convertToDatabaseColumn(CourseVersionEnrollmentStatus status) {
        if (status == null) {
            return null;
        }
        return status.name().toLowerCase();
    }

    @Override
    public CourseVersionEnrollmentStatus convertToEntityAttribute(String dbData) {
        if (dbData == null) {
            return null;
        }
        try {
            return CourseVersionEnrollmentStatus.valueOf(dbData.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}