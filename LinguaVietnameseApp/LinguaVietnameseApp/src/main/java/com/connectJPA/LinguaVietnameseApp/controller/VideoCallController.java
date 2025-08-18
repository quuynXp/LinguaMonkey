
package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.VideoCallRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.VideoCallResponse;
import com.connectJPA.LinguaVietnameseApp.service.VideoCallService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/video-calls")
@RequiredArgsConstructor
public class VideoCallController {
    private final VideoCallService videoCallService;
    private final MessageSource messageSource;

    @Operation(summary = "Get all video calls", description = "Retrieve a paginated list of video calls with optional filtering by callerId or status")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved video calls"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters")
    })
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public AppApiResponse<Page<VideoCallResponse>> getAllVideoCalls(
            @Parameter(description = "Caller ID filter") @RequestParam(required = false) String callerId,
            @Parameter(description = "Status filter") @RequestParam(required = false) String status,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        Page<VideoCallResponse> videoCalls = videoCallService.getAllVideoCalls(callerId, status, pageable);
        return AppApiResponse.<Page<VideoCallResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("videoCall.list.success", null, locale))
                .result(videoCalls)
                .build();
    }

    @Operation(summary = "Get video call by ID", description = "Retrieve a video call by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved video call"),
            @ApiResponse(responseCode = "404", description = "Video call not found")
    })
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or T(java.util.UUID).fromString(authentication.name).equals(#id)")
    public AppApiResponse<VideoCallResponse> getVideoCallById(
            @Parameter(description = "Video call ID") @PathVariable UUID id,
            Locale locale) {
        VideoCallResponse videoCall = videoCallService.getVideoCallById(id);
        return AppApiResponse.<VideoCallResponse>builder()
                .code(200)
                .message(messageSource.getMessage("videoCall.get.success", null, locale))
                .result(videoCall)
                .build();
    }

    @Operation(summary = "Create a new video call", description = "Create a new video call with the provided details")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Video call created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid video call data")
    })
    @PostMapping
    public AppApiResponse<VideoCallResponse> createVideoCall(
            @Valid @RequestBody VideoCallRequest request,
            Locale locale) {
        VideoCallResponse videoCall = videoCallService.createVideoCall(request);
        return AppApiResponse.<VideoCallResponse>builder()
                .code(201)
                .message(messageSource.getMessage("videoCall.created.success", null, locale))
                .result(videoCall)
                .build();
    }

    @Operation(summary = "Update a video call", description = "Update an existing video call by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Video call updated successfully"),
            @ApiResponse(responseCode = "404", description = "Video call not found"),
            @ApiResponse(responseCode = "400", description = "Invalid video call data")
    })
    @PutMapping("/{id}")
    public AppApiResponse<VideoCallResponse> updateVideoCall(
            @Parameter(description = "Video call ID") @PathVariable UUID id,
            @Valid @RequestBody VideoCallRequest request,
            Locale locale) {
        VideoCallResponse videoCall = videoCallService.updateVideoCall(id, request);
        return AppApiResponse.<VideoCallResponse>builder()
                .code(200)
                .message(messageSource.getMessage("videoCall.updated.success", null, locale))
                .result(videoCall)
                .build();
    }

    @Operation(summary = "Delete a video call", description = "Soft delete a video call by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Video call deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Video call not found")
    })
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public AppApiResponse<Void> deleteVideoCall(
            @Parameter(description = "Video call ID") @PathVariable UUID id,
            Locale locale) {
        videoCallService.deleteVideoCall(id);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("videoCall.deleted.success", null, locale))
                .build();
    }
}
