package com.connectJPA.LinguaVietnameseApp.dto.request;



import com.connectJPA.LinguaVietnameseApp.enums.ContentType;

import com.fasterxml.jackson.annotation.JsonInclude; // <--- Import mới

import lombok.*;



import java.util.UUID;



@Data

@Builder

@NoArgsConstructor

@AllArgsConstructor

@JsonInclude(JsonInclude.Include.NON_NULL) // <--- Thêm annotation này

public class MemorizationRequest {

    private UUID userId;

    private ContentType contentType;

    private UUID contentId; // Optional, for EVENT, LESSON, VIDEO

    private String noteText; // Optional, for NOTE, VOCABULARY, FORMULA

    private boolean isFavorite;

}