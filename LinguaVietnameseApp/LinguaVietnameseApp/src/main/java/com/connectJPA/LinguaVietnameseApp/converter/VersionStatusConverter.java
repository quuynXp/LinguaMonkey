// package com.connectJPA.LinguaVietnameseApp.converter;

// import com.connectJPA.LinguaVietnameseApp.enums.VersionStatus;
// import jakarta.persistence.AttributeConverter;
// import jakarta.persistence.Converter;

// @Converter(autoApply = true)
// public class VersionStatusConverter implements AttributeConverter<VersionStatus, String> {

//     @Override
//     public String convertToDatabaseColumn(VersionStatus attribute) {
//         if (attribute == null) {
//             return null;
//         }
//         return attribute.name().toLowerCase();
//     }

//     @Override
//     public VersionStatus convertToEntityAttribute(String dbData) {
//         if (dbData == null) {
//             return null;
//         }
//         try {
//             return VersionStatus.valueOf(dbData.toUpperCase());
//         } catch (IllegalArgumentException e) {
//             return null;
//         }
//     }
// }