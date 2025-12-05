package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.CallPreferencesRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.RoomResponse;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.RoomRepository;
import com.connectJPA.LinguaVietnameseApp.service.MatchmakingQueueService;
import com.connectJPA.LinguaVietnameseApp.service.RoomService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/matchmaking")
@RequiredArgsConstructor
public class MatchmakingController {

    private final MatchmakingQueueService queueService;
    private final RoomService roomService;
    private final RoomRepository roomRepository;

    @Operation(summary = "Find a call partner", description = "Adds user to queue and tries to find a best match.")
    @PostMapping("/find-call")
    public AppApiResponse<Map<String, Object>> findCallPartner(
            @RequestBody CallPreferencesRequest request) {

        String currentUserIdStr = SecurityContextHolder.getContext().getAuthentication().getName();
        UUID currentUserId = UUID.fromString(currentUserIdStr);

        // 1. Check if I was already matched by someone else while I was waiting
        MatchmakingQueueService.MatchResult pendingMatch = queueService.checkPendingMatch(currentUserId);
        if (pendingMatch != null) {
            // Reconstruct Room Response from stored data or fetch fresh
            RoomResponse room = roomService.getRoomById(pendingMatch.getRoomId()); // Assuming roomName stores the unique ID string
            return buildMatchedResponse(room, pendingMatch.getScore());
        }

        // 2. Add self to queue
        queueService.addToQueue(currentUserId, request);

        // 3. Try to find a partner
        MatchmakingQueueService.MatchResult matchResult = queueService.findMatch(currentUserId);

        if (matchResult != null) {
            UUID partnerId = matchResult.getPartnerId();
            RoomResponse room = roomService.findOrCreatePrivateRoom(currentUserId, partnerId);

            // 4. Notify myself (Immediate return)
            queueService.removeFromQueue(currentUserId);
            
            // 5. Notify partner (Save to pendingMatches so they find it on next poll)
            // Storing room info in the result for the partner
            MatchmakingQueueService.MatchResult partnerResult = new MatchmakingQueueService.MatchResult(
                currentUserId, 
                matchResult.getScore(), 
                room.getRoomId(), 
                room.getRoomId().toString() // Fixed: Convert UUID to String for roomName
            );
            queueService.notifyPartner(partnerId, partnerResult);

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
    
    private AppApiResponse<Map<String, Object>> buildMatchedResponse(RoomResponse room, int score) {
        Map<String, Object> responseData = new HashMap<>();
        responseData.put("status", "MATCHED");
        responseData.put("room", room);
        responseData.put("score", score);

        return AppApiResponse.<Map<String, Object>>builder()
                .code(200)
                .message("Match found successfully!")
                .result(responseData)
                .build();
    }

    @PostMapping("/cancel")
    public AppApiResponse<Void> cancelSearch() {
        String currentUserIdStr = SecurityContextHolder.getContext().getAuthentication().getName();
        queueService.removeFromQueue(UUID.fromString(currentUserIdStr));
        return AppApiResponse.<Void>builder().code(200).message("Removed from queue").build();
    }
}