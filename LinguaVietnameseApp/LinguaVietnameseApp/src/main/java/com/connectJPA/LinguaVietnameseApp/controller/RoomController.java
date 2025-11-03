package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.RoomMemberRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.RoomRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.RoomResponse;
import com.connectJPA.LinguaVietnameseApp.enums.RoomPurpose;
import com.connectJPA.LinguaVietnameseApp.enums.RoomType;
import com.connectJPA.LinguaVietnameseApp.service.RoomService;
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

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/rooms")
@RequiredArgsConstructor
public class RoomController {
    private final RoomService roomService;
    private final MessageSource messageSource;

    @Operation(summary = "Get all rooms", description = "Retrieve a paginated list of rooms with optional filtering")
    @GetMapping
    public AppApiResponse<Page<RoomResponse>> getAllRooms(
            @RequestParam(required = false) String roomName,
            @RequestParam(required = false) UUID creatorId,
            @RequestParam(required = false) RoomPurpose purpose,
            @RequestParam(required = false) RoomType roomType,
            Pageable pageable,
            Locale locale) {
        Page<RoomResponse> rooms = roomService.getAllRooms(roomName, creatorId, purpose, roomType, pageable);
        return AppApiResponse.<Page<RoomResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("room.list.success", null, locale))
                .result(rooms)
                .build();
    }

    @Operation(summary = "Get room by ID", description = "Retrieve a room by its ID")
    @GetMapping("/{id}")
    public AppApiResponse<RoomResponse> getRoomById(
            @PathVariable UUID id,
            Locale locale) {
        RoomResponse room = roomService.getRoomById(id);
        return AppApiResponse.<RoomResponse>builder()
                .code(200)
                .message(messageSource.getMessage("room.get.success", null, locale))
                .result(room)
                .build();
    }

    @Operation(summary = "Create a new room", description = "Create a new room with specified purpose and type")
    @PostMapping
    public AppApiResponse<RoomResponse> createRoom(
            @Valid @RequestBody RoomRequest request,
            Locale locale) {
        RoomResponse room = roomService.createRoom(request);
        return AppApiResponse.<RoomResponse>builder()
                .code(201)
                .message(messageSource.getMessage("room.created.success", null, locale))
                .result(room)
                .build();
    }

    @Operation(summary = "Update a room", description = "Update room details, including purpose and type")
    @PutMapping("/{id}")
    public AppApiResponse<RoomResponse> updateRoom(
            @PathVariable UUID id,
            @Valid @RequestBody RoomRequest request,
            Locale locale) {
        RoomResponse room = roomService.updateRoom(id, request);
        return AppApiResponse.<RoomResponse>builder()
                .code(200)
                .message(messageSource.getMessage("room.updated.success", null, locale))
                .result(room)
                .build();
    }

    @Operation(summary = "Delete a room", description = "Soft delete a room by its ID")
    @DeleteMapping("/{id}")
    public AppApiResponse<Void> deleteRoom(
            @PathVariable UUID id,
            Locale locale) {
        roomService.deleteRoom(id);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("room.deleted.success", null, locale))
                .build();
    }

    @Operation(summary = "Add members to a group chat room", description = "Add users to a GROUP_CHAT room")
    @PostMapping("/{id}/members")
    public AppApiResponse<Void> addRoomMembers(
            @PathVariable UUID id,
            @Valid @RequestBody List<RoomMemberRequest> memberRequests,
            Locale locale) {
        roomService.addRoomMembers(id, memberRequests);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("room.members.added.success", null, locale))
                .build();
    }

    @Operation(summary = "Remove members from a group chat room", description = "Remove users from a GROUP_CHAT room")
    @DeleteMapping("/{id}/members")
    public AppApiResponse<Void> removeRoomMembers(
            @PathVariable UUID id,
            @RequestBody List<UUID> userIds,
            Locale locale) {
        roomService.removeRoomMembers(id, userIds);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("room.members.removed.success", null, locale))
                .build();
    }


}