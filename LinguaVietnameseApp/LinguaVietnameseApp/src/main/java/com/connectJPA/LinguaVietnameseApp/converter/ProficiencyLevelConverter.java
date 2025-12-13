// package com.connectJPA.LinguaVietnameseApp.converter;

// import com.connectJPA.LinguaVietnameseApp.enums.ProficiencyLevel;
// import jakarta.persistence.AttributeConverter;
// import jakarta.persistence.Converter;

// @Converter(autoApply = true)
// public class ProficiencyLevelConverter implements AttributeConverter<ProficiencyLevel, String> {

//     @Override
//     public String convertToDatabaseColumn(ProficiencyLevel attribute) {
//         if (attribute == null) {
//             return null;
//         }
//         return attribute.name().toLowerCase();
//     }

//     @Override
//     public ProficiencyLevel convertToEntityAttribute(String dbData) {
//         if (dbData == null) {
//             return null;
//         }
//         try {
//             return ProficiencyLevel.valueOf(dbData.toUpperCase());
//         } catch (IllegalArgumentException e) {
//             return null;
//         }
//     }
// }