
package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.FriendshipRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.FriendshipResponse;
import com.connectJPA.LinguaVietnameseApp.service.FriendshipService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/friendships")
@RequiredArgsConstructor
public class FriendshipController {
    private final FriendshipService friendshipService;
    private final MessageSource messageSource;

    @Operation(summary = "Get all friendships", description = "Retrieve a paginated list of friendships with optional filtering by user1Id or status")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved friendships"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters")
    })
    @GetMapping
    public AppApiResponse<Page<FriendshipResponse>> getAllFriendships(
            @Parameter(description = "User1 ID filter") @RequestParam(required = false) String user1Id,
            @Parameter(description = "Status filter") @RequestParam(required = false) String status,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        Page<FriendshipResponse> friendships = friendshipService.getAllFriendships(user1Id, status, pageable);
        return AppApiResponse.<Page<FriendshipResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("friendship.list.success", null, locale))
                .result(friendships)
                .build();
    }

    @Operation(summary = "Get friendship by user IDs", description = "Retrieve a friendship by user1Id and user2Id")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved friendship"),
            @ApiResponse(responseCode = "404", description = "Friendship not found")
    })
    @GetMapping("/{user1Id}/{user2Id}")
    public AppApiResponse<FriendshipResponse> getFriendshipByIds(
            @Parameter(description = "User1 ID") @PathVariable UUID user1Id,
            @Parameter(description = "User2 ID") @PathVariable UUID user2Id,
            Locale locale) {
        FriendshipResponse friendship = friendshipService.getFriendshipByIds(user1Id, user2Id);
        return AppApiResponse.<FriendshipResponse>builder()
                .code(200)
                .message(messageSource.getMessage("friendship.get.success", null, locale))
                .result(friendship)
                .build();
    }

    @Operation(summary = "Create a new friendship", description = "Create a new friendship with the provided details")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Friendship created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid friendship data")
    })
    @PostMapping
    public AppApiResponse<FriendshipResponse> createFriendship(
            @Valid @RequestBody FriendshipRequest request,
            Locale locale) {
        FriendshipResponse friendship = friendshipService.createFriendship(request);
        return AppApiResponse.<FriendshipResponse>builder()
                .code(201)
                .message(messageSource.getMessage("friendship.created.success", null, locale))
                .result(friendship)
                .build();
    }

    @Operation(summary = "Update a friendship", description = "Update an existing friendship by user1Id and user2Id")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Friendship updated successfully"),
            @ApiResponse(responseCode = "404", description = "Friendship not found"),
            @ApiResponse(responseCode = "400", description = "Invalid friendship data")
    })
    @PutMapping("/{user1Id}/{user2Id}")
    public AppApiResponse<FriendshipResponse> updateFriendship(
            @Parameter(description = "User1 ID") @PathVariable UUID user1Id,
            @Parameter(description = "User2 ID") @PathVariable UUID user2Id,
            @Valid @RequestBody FriendshipRequest request,
            Locale locale) {
        FriendshipResponse friendship = friendshipService.updateFriendship(user1Id, user2Id, request);
        return AppApiResponse.<FriendshipResponse>builder()
                .code(200)
                .message(messageSource.getMessage("friendship.updated.success", null, locale))
                .result(friendship)
                .build();
    }

    @Operation(summary = "Delete a friendship", description = "Soft delete a friendship by user1Id and user2Id")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Friendship deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Friendship not found")
    })
    @DeleteMapping("/{user1Id}/{user2Id}")
    public AppApiResponse<Void> deleteFriendship(
            @Parameter(description = "User1 ID") @PathVariable UUID user1Id,
            @Parameter(description = "User2 ID") @PathVariable UUID user2Id,
            Locale locale) {
        friendshipService.deleteFriendship(user1Id, user2Id);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("friendship.deleted.success", null, locale))
                .build();
    }
}
