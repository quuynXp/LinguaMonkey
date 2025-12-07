package com.connectJPA.LinguaVietnameseApp.controller;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.UUID;

@Controller
@RequiredArgsConstructor
@Slf4j
public class WebRTCController {

    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/chat/room/{roomId}/webrtc")
    public void handleWebRTCSignaling(
            @DestinationVariable UUID roomId,
            @Payload WebRTCSignal signal,
            Principal principal) {
        
        // Tag the sender ID for the receiver to know who sent it
        signal.setSenderId(UUID.fromString(principal.getName()));
        
        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/webrtc", signal);
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WebRTCSignal {
        private String type; // "join", "offer", "answer", "ice_candidate"
        private String sdp;
        private Object candidate;
        private UUID senderId;
    }
}