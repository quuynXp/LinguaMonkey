package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.JoinRoomRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.RoomMemberRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.RoomRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.MemberResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.RoomResponse;
import com.connectJPA.LinguaVietnameseApp.enums.RoomPurpose;
import com.connectJPA.LinguaVietnameseApp.enums.RoomType;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.service.RoomService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
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

    @Operation(summary = "Get all rooms (Public Lobby)", description = "Retrieve rooms for the lobby list")
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

    @Operation(summary = "Get Joined Rooms (My Inbox)", description = "Get rooms the current user is a member of (Private, AI, etc.)")
    @GetMapping("/joined")
    public AppApiResponse<Page<RoomResponse>> getJoinedRooms(
            @RequestParam(required = false) RoomPurpose purpose,
            Pageable pageable,
            Locale locale) {
        UUID userId = UUID.fromString(SecurityContextHolder.getContext().getAuthentication().getName());
        Page<RoomResponse> rooms = roomService.getJoinedRooms(userId, purpose, pageable);
        return AppApiResponse.<Page<RoomResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("room.joined_list.success", null, locale))
                .result(rooms)
                .build();
    }

    @Operation(summary = "Join Room", description = "Join a room using Room ID or 6-digit Code, with optional password")
    @PostMapping("/join")
    public AppApiResponse<RoomResponse> joinRoom(
            @Valid @RequestBody JoinRoomRequest request,
            Locale locale) {
        RoomResponse response = roomService.joinRoom(request);
        return AppApiResponse.<RoomResponse>builder()
                .code(200)
                .message(messageSource.getMessage("room.joined.success", null, locale))
                .result(response)
                .build();
    }

    @Operation(summary = "Get or Create Private Room", description = "Get existing private chat room with target user or create new one")
    @PostMapping("/private")
    public AppApiResponse<RoomResponse> getPrivateRoom(
            @RequestParam UUID targetUserId,
            Locale locale) {
        UUID currentUserId = UUID.fromString(SecurityContextHolder.getContext().getAuthentication().getName());
        RoomResponse room = roomService.findOrCreatePrivateRoom(currentUserId, targetUserId);
        return AppApiResponse.<RoomResponse>builder()
                .code(200)
                .message("Success")
                .result(room)
                .build();
    }

    @Operation(summary = "Find or Create AI Chat Room", description = "Finds an existing AI_SOLO room for the authenticated user")
    @GetMapping("/ai-chat-room")
    public AppApiResponse<RoomResponse> getAiChatRoom(
            @RequestParam UUID userId,
            Locale locale) {
        String authenticatedUserIdStr = SecurityContextHolder.getContext().getAuthentication().getName();
        if (authenticatedUserIdStr == null || authenticatedUserIdStr.equalsIgnoreCase("anonymousUser")) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        UUID currentUserId = UUID.fromString(authenticatedUserIdStr);
        if (!currentUserId.equals(userId)) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        RoomResponse room = roomService.findOrCreateAiChatRoom(currentUserId);
        return AppApiResponse.<RoomResponse>builder()
                .code(200)
                .message(messageSource.getMessage("room.ai_room.success", null, locale))
                .result(room)
                .build();
    }

    @Operation(summary = "Get room members", description = "Retrieve a list of members for a specific room")
    @GetMapping("/{id}/members")
    public AppApiResponse<List<MemberResponse>> getRoomMembers(
            @PathVariable UUID id,
            Locale locale) {
        List<MemberResponse> members = roomService.getRoomMembers(id);
        return AppApiResponse.<List<MemberResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("room.members.list.success", null, locale))
                .result(members)
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

    @Operation(summary = "Create a new room", description = "Create a new room")
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

    @Operation(summary = "Update a room", description = "Update room details")
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

    @Operation(summary = "Delete a room", description = "Soft delete a room")
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