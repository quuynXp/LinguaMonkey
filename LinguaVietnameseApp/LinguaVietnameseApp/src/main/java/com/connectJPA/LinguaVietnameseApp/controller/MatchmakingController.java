package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.CallPreferencesRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.RoomResponse;
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

    @Operation(summary = "Find a call partner", description = "Adds user to queue and tries to find a best match.")
    @PostMapping("/find-call")
    public AppApiResponse<Map<String, Object>> findCallPartner(
            @RequestBody CallPreferencesRequest request) {

        String currentUserIdStr = SecurityContextHolder.getContext().getAuthentication().getName();
        UUID currentUserId = UUID.fromString(currentUserIdStr);

        queueService.addToQueue(currentUserId, request);

        MatchmakingQueueService.MatchResult matchResult = queueService.findMatch(currentUserId);

        Map<String, Object> responseData = new HashMap<>();

        if (matchResult != null) {
            UUID partnerId = matchResult.getPartnerId();
            RoomResponse room = roomService.findOrCreatePrivateRoom(currentUserId, partnerId);

            // Remove both from queue atomically in real usage (here conceptually)
            queueService.removeFromQueue(currentUserId);
            queueService.removeFromQueue(partnerId);

            responseData.put("status", "MATCHED");
            responseData.put("room", room);
            responseData.put("score", matchResult.getScore());

            return AppApiResponse.<Map<String, Object>>builder()
                    .code(200)
                    .message("Match found successfully!")
                    .result(responseData)
                    .build();
        } else {
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
    
    @PostMapping("/cancel")
    public AppApiResponse<Void> cancelSearch() {
        String currentUserIdStr = SecurityContextHolder.getContext().getAuthentication().getName();
        queueService.removeFromQueue(UUID.fromString(currentUserIdStr));
        return AppApiResponse.<Void>builder().code(200).message("Removed from queue").build();
    }
}