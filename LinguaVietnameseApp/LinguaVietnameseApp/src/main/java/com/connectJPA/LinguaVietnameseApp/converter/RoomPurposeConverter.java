// package com.connectJPA.LinguaVietnameseApp.converter;

// import com.connectJPA.LinguaVietnameseApp.enums.RoomPurpose;
// import jakarta.persistence.AttributeConverter;
// import jakarta.persistence.Converter;

// import java.util.stream.Stream;

// @Converter(autoApply = true)
// public class RoomPurposeConverter implements AttributeConverter<RoomPurpose, String> {

//     @Override
//     public String convertToDatabaseColumn(RoomPurpose purpose) {
//         if (purpose == null) {
//             return null;
//         }
//         return purpose.name();
//     }

//     @Override
//     public RoomPurpose convertToEntityAttribute(String code) {
//         if (code == null) {
//             return null;
//         }
//         return Stream.of(RoomPurpose.values())
//                 .filter(c -> c.name().equalsIgnoreCase(code))
//                 .findFirst()
//                 .orElseThrow(() -> new IllegalArgumentException("Unknown RoomPurpose: " + code));
//     }
// }