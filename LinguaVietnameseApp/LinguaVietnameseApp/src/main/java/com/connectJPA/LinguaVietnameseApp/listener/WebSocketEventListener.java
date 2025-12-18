package com.connectJPA.LinguaVietnameseApp.listener;

import com.connectJPA.LinguaVietnameseApp.controller.ChatController;
import com.connectJPA.LinguaVietnameseApp.dto.request.UserStatusRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Component
@Slf4j
@RequiredArgsConstructor
public class WebSocketEventListener {

    private final SimpMessageSendingOperations messagingTemplate;
    private final RedisTemplate<String, String> redisTemplate;

    private static final String ONLINE_USER_KEY_PREFIX = "user:online:";
    private static final long TIMEOUT_MINUTES = 5; 

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal principal = headerAccessor.getUser();

        if (principal != null) {
            String userId = principal.getName();
            log.info("User Connected: {}", userId);

            String redisKey = ONLINE_USER_KEY_PREFIX + userId;
            redisTemplate.opsForValue().set(redisKey, "ONLINE", TIMEOUT_MINUTES, TimeUnit.MINUTES);

            UserStatusRequest statusUpdate = UserStatusRequest.builder()
                    .userId(UUID.fromString(userId))
                    .status("ONLINE")
                    .build();
            
            messagingTemplate.convertAndSend("/topic/user/" + userId + "/status", statusUpdate);
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal principal = headerAccessor.getUser();

        if (principal != null) {
            String userId = principal.getName();
            log.info("User Disconnected: {}", userId);

            String redisKey = ONLINE_USER_KEY_PREFIX + userId;
            redisTemplate.delete(redisKey);

            UserStatusRequest statusUpdate = UserStatusRequest.builder()
                    .userId(UUID.fromString(userId))
                    .status("OFFLINE")
                    .build();

            messagingTemplate.convertAndSend("/topic/user/" + userId + "/status", statusUpdate);
        }
    }
}