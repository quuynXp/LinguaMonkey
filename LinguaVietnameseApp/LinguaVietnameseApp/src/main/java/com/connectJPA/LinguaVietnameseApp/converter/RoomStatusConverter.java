// package com.connectJPA.LinguaVietnameseApp.converter;

// import com.connectJPA.LinguaVietnameseApp.enums.RoomStatus;
// import jakarta.persistence.AttributeConverter;
// import jakarta.persistence.Converter;

// @Converter(autoApply = true)
// public class RoomStatusConverter implements AttributeConverter<RoomStatus, String> {

//     @Override
//     public String convertToDatabaseColumn(RoomStatus attribute) {
//         if (attribute == null) {
//             return null;
//         }
//         return attribute.name().toLowerCase();
//     }

//     @Override
//     public RoomStatus convertToEntityAttribute(String dbData) {
//         if (dbData == null) {
//             return null;
//         }
//         try {
//             return RoomStatus.valueOf(dbData.toUpperCase());
//         } catch (IllegalArgumentException e) {
//             return null;
//         }
//     }
// }