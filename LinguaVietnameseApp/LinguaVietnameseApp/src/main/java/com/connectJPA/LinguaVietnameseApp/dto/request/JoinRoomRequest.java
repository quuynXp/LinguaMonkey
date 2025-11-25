package com.connectJPA.LinguaVietnameseApp.dto.request;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JoinRoomRequest {

    private UUID roomId;

    @Size(max = 6, message = "Room code must be 6 characters")
    private String roomCode;

    private String password;
}