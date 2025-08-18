package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.GroupSessionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.GroupSessionResponse;
import com.connectJPA.LinguaVietnameseApp.service.GroupSessionService;
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
@RequestMapping("/api/group-sessions")
@RequiredArgsConstructor
public class GroupSessionController {
    private final GroupSessionService groupSessionService;
    private final MessageSource messageSource;

    @Operation(summary = "Get all group sessions", description = "Retrieve a paginated list of group sessions with optional filtering by lessonId or roomId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved group sessions"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters")
    })
    @GetMapping
    public AppApiResponse<Page<GroupSessionResponse>> getAllGroupSessions(
            @Parameter(description = "Lesson ID filter") @RequestParam(required = false) String lessonId,
            @Parameter(description = "Room ID filter") @RequestParam(required = false) String roomId,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        Page<GroupSessionResponse> sessions = groupSessionService.getAllGroupSessions(lessonId, roomId, pageable);
        return AppApiResponse.<Page<GroupSessionResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("groupSession.list.success", null, locale))
                .result(sessions)
                .build();
    }

    @Operation(summary = "Get group session by ID", description = "Retrieve a group session by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved group session"),
            @ApiResponse(responseCode = "404", description = "Group session not found")
    })
    @GetMapping("/{id}")
    public AppApiResponse<GroupSessionResponse> getGroupSessionById(
            @Parameter(description = "Group session ID") @PathVariable UUID id,
            Locale locale) {
        GroupSessionResponse session = groupSessionService.getGroupSessionById(id);
        return AppApiResponse.<GroupSessionResponse>builder()
                .code(200)
                .message(messageSource.getMessage("groupSession.get.success", null, locale))
                .result(session)
                .build();
    }

    @Operation(summary = "Create a new group session", description = "Create a new group session with the provided details")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Group session created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid group session data")
    })
    @PostMapping
    public AppApiResponse<GroupSessionResponse> createGroupSession(
            @Valid @RequestBody GroupSessionRequest request,
            Locale locale) {
        GroupSessionResponse session = groupSessionService.createGroupSession(request);
        return AppApiResponse.<GroupSessionResponse>builder()
                .code(201)
                .message(messageSource.getMessage("groupSession.created.success", null, locale))
                .result(session)
                .build();
    }

    @Operation(summary = "Update a group session", description = "Update an existing group session by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Group session updated successfully"),
            @ApiResponse(responseCode = "404", description = "Group session not found"),
            @ApiResponse(responseCode = "400", description = "Invalid group session data")
    })
    @PutMapping("/{id}")
    public AppApiResponse<GroupSessionResponse> updateGroupSession(
            @Parameter(description = "Group session ID") @PathVariable UUID id,
            @Valid @RequestBody GroupSessionRequest request,
            Locale locale) {
        GroupSessionResponse session = groupSessionService.updateGroupSession(id, request);
        return AppApiResponse.<GroupSessionResponse>builder()
                .code(200)
                .message(messageSource.getMessage("groupSession.updated.success", null, locale))
                .result(session)
                .build();
    }

    @Operation(summary = "Delete a group session", description = "Soft delete a group session by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Group session deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Group session not found")
    })
    @DeleteMapping("/{id}")
    public AppApiResponse<Void> deleteGroupSession(
            @Parameter(description = "Group session ID") @PathVariable UUID id,
            Locale locale) {
        groupSessionService.deleteGroupSession(id);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("groupSession.deleted.success", null, locale))
                .build();
    }
}