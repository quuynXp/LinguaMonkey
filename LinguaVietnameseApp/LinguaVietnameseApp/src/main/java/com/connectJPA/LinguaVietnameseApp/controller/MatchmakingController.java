// package com.connectJPA.LinguaVietnameseApp.controller;

// import com.connectJPA.LinguaVietnameseApp.dto.request.CallPreferencesRequest;
// import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
// import com.connectJPA.LinguaVietnameseApp.dto.response.RoomResponse;
// import com.connectJPA.LinguaVietnameseApp.grpc.GrpcClientService;
// import com.connectJPA.LinguaVietnameseApp.service.MatchmakingQueueService;
// import com.connectJPA.LinguaVietnameseApp.service.RoomService;
// import io.swagger.v3.oas.annotations.Operation;
// import learning.CallPreferences;
// import learning.FindMatchResponse;
// import learning.MatchCandidate;
// import lombok.RequiredArgsConstructor;
// import org.springframework.context.MessageSource;
// import org.springframework.security.core.context.SecurityContextHolder;
// import org.springframework.web.bind.annotation.*;

// import java.util.HashMap;
// import java.util.List;
// import java.util.Locale;
// import java.util.Map;
// import java.util.UUID;
// import java.util.concurrent.ExecutionException;

// @RestController
// @RequestMapping("/api/v1/matchmaking")
// @RequiredArgsConstructor
// public class MatchmakingController {

//     private final GrpcClientService grpcClientService;
//     private final MatchmakingQueueService queueService; // Service quản lý hàng đợi
//     private final RoomService roomService;
//     private final MessageSource messageSource;

//     @Operation(summary = "Find a call partner", description = "Adds user to queue and uses AI to find best match from waiting list")
//     @PostMapping("/find-call")
//     public AppApiResponse<Object> findCallPartner(
//             @RequestBody CallPreferencesRequest request,
//             @RequestHeader("Authorization") String authorizationHeader,
//             Locale locale) throws ExecutionException, InterruptedException {

//         String currentUserIdStr = SecurityContextHolder.getContext().getAuthentication().getName();
//         UUID currentUserId = UUID.fromString(currentUserIdStr);

//         // 1. Thêm user hiện tại vào "Waiting Room" (Hàng đợi)
//         queueService.addToQueue(currentUserId, request);

//         // 2. Lấy danh sách các Candidates đang chờ trong hàng đợi
//         List<MatchCandidate> candidates = queueService.getCandidatesFor(currentUserIdStr);
//         int currentQueueSize = queueService.getQueueSize();

//         // Nếu không có ai khác đang chờ, trả về trạng thái WAITING ngay
//         if (candidates.isEmpty()) {
//             Map<String, Object> waitResult = new HashMap<>();
//             waitResult.put("status", "WAITING");
//             waitResult.put("queueSize", currentQueueSize);

//             return AppApiResponse.builder()
//                     .code(202) // Accepted but not completed
//                     .message("Added to queue. Waiting for other users...")
//                     .result(waitResult)
//                     .build();
//         }

//         // 3. Chuẩn bị dữ liệu gRPC
//         CallPreferences grpcPrefs = CallPreferences.newBuilder()
//                 .addAllInterests(request.getInterests())
//                 .setGender(request.getGender())
//                 .setNativeLanguage(request.getNativeLanguage())
//                 .setLearningLanguage(request.getLearningLanguage())
//                 .setAgeRange(request.getAgeRange())
//                 .setCallDuration(request.getCallDuration())
//                 .build();

//         String token = authorizationHeader.substring(7);

//         // 4. Gửi User A + List Candidates sang Python để AI chọn
//         FindMatchResponse matchResponse = grpcClientService.callFindMatchAsync(
//                 token, 
//                 currentUserIdStr, 
//                 grpcPrefs, 
//                 candidates
//         ).get();

//         // 5. Xử lý kết quả từ AI
//         if (matchResponse.getMatchFound()) {
//             String partnerIdStr = matchResponse.getPartnerUserId();
//             UUID partnerId = UUID.fromString(partnerIdStr);

//             // 5a. Tạo phòng Private Chat/Video cho 2 người
//             RoomResponse room = roomService.findOrCreatePrivateRoom(currentUserId, partnerId);

//             // 5b. Xóa cả 2 người khỏi hàng đợi (vì đã match xong)
//             queueService.removeFromQueue(currentUserIdStr);
//             queueService.removeFromQueue(partnerIdStr);

//             // 5c. Trả về thông tin phòng để Frontend navigate vào
//             return AppApiResponse.builder()
//                     .code(200)
//                     .message("Match found! Compatibility: " + matchResponse.getCompatibilityScore() + "%")
//                     .result(room) // Trả về RoomResponse chứa roomId
//                     .build();
//         } else {
//             // AI không thấy ai hợp trong list hiện tại (dù có người chờ)
//             // Vẫn giữ user trong hàng đợi
//             Map<String, Object> waitResult = new HashMap<>();
//             waitResult.put("status", "WAITING");
//             waitResult.put("queueSize", currentQueueSize);

//             return AppApiResponse.builder()
//                     .code(202)
//                     .message("No suitable match found yet based on AI analysis. Still in queue.")
//                     .result(waitResult)
//                     .build();
//         }
//     }
    
//     // API để user hủy tìm kiếm (xóa khỏi hàng đợi)
//     @PostMapping("/cancel")
//     public AppApiResponse<Void> cancelSearch() {
//         String currentUserIdStr = SecurityContextHolder.getContext().getAuthentication().getName();
//         queueService.removeFromQueue(currentUserIdStr);
//         return AppApiResponse.<Void>builder().code(200).message("Removed from queue").build();
//     }
// }
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

    @Operation(summary = "Find a call partner", description = "Adds user to queue and tries to find a match using criteria relaxation over time.")
    @PostMapping("/find-call")
    public AppApiResponse<Object> findCallPartner(
            @RequestBody CallPreferencesRequest request) {

        String currentUserIdStr = SecurityContextHolder.getContext().getAuthentication().getName();
        UUID currentUserId = UUID.fromString(currentUserIdStr);

        // 1. Add or Update user in Queue
        queueService.addToQueue(currentUserId, request);

        // 2. Try to find a match immediately based on queue state and time logic
        MatchmakingQueueService.MatchResult matchResult = queueService.findMatch(currentUserId);

        if (matchResult != null) {
            UUID partnerId = matchResult.getPartnerId();

            // 3. Match found -> Create Room
            RoomResponse room = roomService.findOrCreatePrivateRoom(currentUserId, partnerId);

            // 4. Remove both from queue
            queueService.removeFromQueue(currentUserId);
            queueService.removeFromQueue(partnerId);

            Map<String, Object> result = new HashMap<>();
            result.put("status", "MATCHED");
            result.put("room", room);
            result.put("score", matchResult.getScore());

            return AppApiResponse.builder()
                    .code(200)
                    .message("Match found successfully!")
                    .result(result)
                    .build();
        } else {
            // 5. No match yet, return waiting status
            // The frontend will poll this API periodically
            Map<String, Object> waitResult = new HashMap<>();
            waitResult.put("status", "WAITING");
            waitResult.put("queueSize", queueService.getQueueSize());
            waitResult.put("secondsWaited", queueService.getSecondsWaited(currentUserId));
            waitResult.put("currentCriteriaLevel", queueService.getCurrentCriteriaThreshold(currentUserId));

            return AppApiResponse.builder()
                    .code(202) // Accepted/Processing
                    .message("Searching for a partner...")
                    .result(waitResult)
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