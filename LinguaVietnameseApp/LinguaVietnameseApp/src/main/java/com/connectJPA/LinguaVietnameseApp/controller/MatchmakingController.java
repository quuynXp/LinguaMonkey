package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.CallPreferencesRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.RoomResponse;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.RoomRepository;
import com.connectJPA.LinguaVietnameseApp.service.MatchmakingQueueService;
import com.connectJPA.LinguaVietnameseApp.service.RoomService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/matchmaking")
@RequiredArgsConstructor
@Slf4j
public class MatchmakingController {

    private final MatchmakingQueueService queueService;
    private final RoomService roomService;
    private final SimpMessagingTemplate messagingTemplate;

    @Operation(summary = "Find a call partner", description = "Adds user to queue and tries to find a best match.")
    @PostMapping("/find-call")
    public AppApiResponse<Map<String, Object>> findCallPartner(
            @RequestBody CallPreferencesRequest request) {

        // LẤY USER ID TỪ REQUEST BODY (THAY VÌ SECURITY CONTEXT)
        UUID currentUserId = request.getUserId();

        if (currentUserId == null) {
            return AppApiResponse.<Map<String, Object>>builder()
                    .code(400)
                    .message("User ID must be provided in the request body.")
                    .result(null)
                    .build();
        }

        // 1. Check if I was already matched by someone else while I was waiting
        MatchmakingQueueService.MatchResult pendingMatch = queueService.checkPendingMatch(currentUserId);
        if (pendingMatch != null) {
            RoomResponse room = roomService.getRoomById(pendingMatch.getRoomId());
            return buildMatchedResponse(room, pendingMatch.getScore());
        }

        // 2. Add self to queue
        queueService.addToQueue(currentUserId, request);

        // 3. Try to find a partner
        MatchmakingQueueService.MatchResult matchResult = queueService.findMatch(currentUserId);

        if (matchResult != null) {
            UUID partnerId = matchResult.getPartnerId();
            // Create a private room for both
            RoomResponse room = roomService.findOrCreatePrivateRoom(currentUserId, partnerId);

            // 4. Notify myself (Immediate return)
            queueService.removeFromQueue(currentUserId);
            
            // 5. Notify partner (Realtime Socket Notification)
            MatchmakingQueueService.MatchResult partnerResult = new MatchmakingQueueService.MatchResult(
                currentUserId, 
                matchResult.getScore(), 
                room.getRoomId(), 
                room.getRoomId().toString()
            );
            
            queueService.notifyPartner(partnerId, partnerResult);
            sendMatchNotificationToPartner(partnerId, room, matchResult.getScore());

            return buildMatchedResponse(room, matchResult.getScore());
        } else {
            // No match found yet
            Map<String, Object> responseData = new HashMap<>();
            responseData.put("status", "WAITING");
            responseData.put("queueSize", queueService.getQueueSize());
            responseData.put("secondsWaited", queueService.getSecondsWaited(currentUserId));
            responseData.put("currentCriteriaLevel", queueService.getCurrentCriteriaThreshold(currentUserId));

            return AppApiResponse.<Map<String, Object>>builder()
                    .code(202)
                    .message("Searching for a partner...")
                    .result(responseData)
                    .build();
        }
    }
    
   private void sendMatchNotificationToPartner(UUID partnerId, RoomResponse room, int score) {
    try {
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "MATCH_FOUND");
        payload.put("status", "MATCHED");
        payload.put("room", room);
        payload.put("score", score);
        
        String destination = "/topic/match-updates/" + partnerId.toString();
        
        messagingTemplate.convertAndSend(destination, payload);
        
        log.info("Sent MATCH_FOUND notification to destination: {}", destination);
    } catch (Exception e) {
        log.error("Failed to send match notification via socket: {}", e.getMessage());
    }
}

    private AppApiResponse<Map<String, Object>> buildMatchedResponse(RoomResponse room, int score) {
    Map<String, Object> responseData = new HashMap<>();
    responseData.put("status", "MATCHED");
    
    Map<String, Object> roomData = new HashMap<>();
    roomData.put("roomId", room.getRoomId().toString()); 
    
    responseData.put("room", room); // Jackson thường xử lý UUID tốt thành String "xxxx-xxxx..."
    responseData.put("score", score);

    return AppApiResponse.<Map<String, Object>>builder()
            .code(200)
            .message("Match found successfully!")
            .result(responseData)
            .build();
}

    @PostMapping("/cancel")
    public AppApiResponse<Void> cancelSearch(@RequestBody Map<String, UUID> requestBody) {
        UUID currentUserId = requestBody.get("userId");
        
        if (currentUserId != null) {
            queueService.removeFromQueue(currentUserId);
            return AppApiResponse.<Void>builder().code(200).message("Removed from queue").build();
        } else {
            return AppApiResponse.<Void>builder().code(400).message("User ID must be provided in the request body.").build();
        }
    }
}