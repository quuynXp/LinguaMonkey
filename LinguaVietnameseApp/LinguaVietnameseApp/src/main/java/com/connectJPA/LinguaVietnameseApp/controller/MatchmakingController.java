package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.grpc.GrpcClientService;
import com.connectJPA.LinguaVietnameseApp.service.VideoCallService;
import com.connectJPA.LinguaVietnameseApp.utils.SecurityUtil;
import io.swagger.v3.oas.annotations.Operation;
import learning.CallPreferences; // Import từ gRPC
import learning.FindMatchResponse; // Import từ gRPC
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import com.connectJPA.LinguaVietnameseApp.dto.request.CallPreferencesRequest; // Bạn cần tạo DTO này

import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.ExecutionException;

@RestController
@RequestMapping("/api/v1/matchmaking")
@RequiredArgsConstructor
public class MatchmakingController {

    private final GrpcClientService grpcClientService;
    private final MessageSource messageSource;
    private final VideoCallService videoCallService; // Dùng để tạo video call
    private final SecurityUtil securityUtil;

    @Operation(summary = "Find a call partner", description = "Finds a partner based on preferences and creates a video call")
    @PostMapping("/find-call")
    public AppApiResponse<FindMatchResponse> findCallPartner(
            @RequestBody CallPreferencesRequest request,
            @RequestHeader("Authorization") String authorizationHeader,
            Locale locale) throws ExecutionException, InterruptedException {

        String currentUserId = SecurityContextHolder.getContext().getAuthentication().getName();

        CallPreferences grpcPreferences = CallPreferences.newBuilder()
                .addAllInterests(request.getInterests())
                .setGender(request.getGender())
                .setNativeLanguage(request.getNativeLanguage())
                .setLearningLanguage(request.getLearningLanguage())
                .setAgeRange(request.getAgeRange())
                .setCallDuration(request.getCallDuration())
                .build();

        String token = authorizationHeader.substring(7);

        // 3. Gọi gRPC service
        FindMatchResponse matchResponse = grpcClientService.callFindMatchAsync(token, currentUserId, grpcPreferences).get();

        // 4. (Quan trọng) Sau khi Python tìm thấy, tạo record VideoCall trong DB Java
        if (matchResponse != null && matchResponse.hasPartner()) {
            videoCallService.createGroupVideoCall(
                    UUID.fromString(currentUserId),
                    List.of(UUID.fromString(matchResponse.getPartner().getUserId())),
                    com.connectJPA.LinguaVietnameseApp.enums.VideoCallType.ONE_TO_ONE
            );
        }

        return AppApiResponse.<FindMatchResponse>builder()
                .code(200)
                .message(messageSource.getMessage("matchmaking.success", null, locale))
                .result(matchResponse)
                .build();
    }
}