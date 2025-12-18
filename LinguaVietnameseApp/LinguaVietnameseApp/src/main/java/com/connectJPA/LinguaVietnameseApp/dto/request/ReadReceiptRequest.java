package com.connectJPA.LinguaVietnameseApp.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReadReceiptRequest {
    private UUID userId;
    private UUID messageId;
    private UUID roomId;
}