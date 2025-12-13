// package com.connectJPA.LinguaVietnameseApp.converter;

// import com.connectJPA.LinguaVietnameseApp.enums.TargetType;
// import jakarta.persistence.AttributeConverter;
// import jakarta.persistence.Converter;

// @Converter(autoApply = true)
// public class TargetTypeConverter implements AttributeConverter<TargetType, String> {

//     @Override
//     public String convertToDatabaseColumn(TargetType attribute) {
//         if (attribute == null) {
//             return null;
//         }
//         return attribute.name().toLowerCase();
//     }

//     @Override
//     public TargetType convertToEntityAttribute(String dbData) {
//         if (dbData == null) {
//             return null;
//         }
//         try {
//             return TargetType.valueOf(dbData.toUpperCase());
//         } catch (IllegalArgumentException e) {
//             return null;
//         }
//     }
// }