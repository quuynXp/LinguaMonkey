package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.CallPreferencesRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.RoomResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Room;
import com.connectJPA.LinguaVietnameseApp.enums.RoomPurpose;
import com.connectJPA.LinguaVietnameseApp.enums.RoomStatus;
import com.connectJPA.LinguaVietnameseApp.enums.RoomTopic;
import com.connectJPA.LinguaVietnameseApp.enums.RoomType;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.RoomRepository;
import com.connectJPA.LinguaVietnameseApp.service.MatchmakingQueueService;
import com.connectJPA.LinguaVietnameseApp.service.RoomService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
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
    private final RoomRepository roomRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Operation(summary = "Find a call partner", description = "Adds user to queue and tries to find a best match.")
    @PostMapping("/find-call")
    public AppApiResponse<Map<String, Object>> findCallPartner(
            @RequestBody CallPreferencesRequest request) {

        UUID currentUserId = request.getUserId();

        if (currentUserId == null) {
            return AppApiResponse.<Map<String, Object>>builder()
                    .code(400)
                    .message("User ID must be provided in the request body.")
                    .result(null)
                    .build();
        }

        MatchmakingQueueService.MatchResult pendingMatch = queueService.checkPendingMatch(currentUserId);
        if (pendingMatch != null) {
            RoomResponse room = roomService.getRoomById(pendingMatch.getRoomId());
            return buildMatchedResponse(room, pendingMatch.getScore());
        }

        queueService.addToQueue(currentUserId, request);

        MatchmakingQueueService.MatchResult matchResult = queueService.findMatch(currentUserId);

        if (matchResult != null) {
            UUID partnerId = matchResult.getPartnerId();
            
            Room newRoom = Room.builder()
                    .creatorId(currentUserId)
                    .topic(RoomTopic.WORLD)
                    .purpose(RoomPurpose.CALL)
                    .roomType(RoomType.GROUP)
                    .status(RoomStatus.ACTIVE)
                    .roomName("Match-" + UUID.randomUUID().toString().substring(0, 8))
                    .build();
            
            newRoom = roomRepository.save(newRoom);
            UUID newRoomId = newRoom.getRoomId();
            
            RoomResponse roomResponse = roomService.getRoomById(newRoomId);

            queueService.removeFromQueue(currentUserId);
            
            matchResult.setRoomId(newRoomId);
            matchResult.setRoomName(newRoom.getRoomName());

            MatchmakingQueueService.MatchResult partnerPayload = new MatchmakingQueueService.MatchResult(
                currentUserId, 
                matchResult.getScore(), 
                newRoomId, 
                newRoom.getRoomName()
            );
            
            queueService.notifyPartner(partnerId, partnerPayload);
            sendMatchNotificationToPartner(partnerId, roomResponse, matchResult.getScore());

            return buildMatchedResponse(roomResponse, matchResult.getScore());
        } else {
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
        
        responseData.put("room", room);
        responseData.put("roomId", room.getRoomId().toString()); 
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