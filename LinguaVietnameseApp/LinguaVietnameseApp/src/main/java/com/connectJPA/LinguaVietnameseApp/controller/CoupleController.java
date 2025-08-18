package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.CoupleRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.CoupleResponse;
import com.connectJPA.LinguaVietnameseApp.service.CoupleService;
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
@RequestMapping("/api/couples")
@RequiredArgsConstructor
public class CoupleController {
    private final CoupleService coupleService;
    private final MessageSource messageSource;

    @Operation(summary = "Get all couples", description = "Retrieve a paginated list of couples with optional filtering by user1Id or status")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved couples"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters")
    })
    @GetMapping
    public AppApiResponse<Page<CoupleResponse>> getAllCouples(
            @Parameter(description = "User1 ID filter") @RequestParam(required = false) UUID user1Id,
            @Parameter(description = "Status filter") @RequestParam(required = false) String status,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        Page<CoupleResponse> couples = coupleService.getAllCouples(user1Id, status, pageable);
        return AppApiResponse.<Page<CoupleResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("couple.list.success", null, locale))
                .result(couples)
                .build();
    }

    @Operation(summary = "Get couple by user IDs", description = "Retrieve a couple by user1Id and user2Id")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved couple"),
            @ApiResponse(responseCode = "404", description = "Couple not found")
    })
    @GetMapping("/{user1Id}/{user2Id}")
    public AppApiResponse<CoupleResponse> getCoupleByIds(
            @Parameter(description = "User1 ID") @PathVariable UUID user1Id,
            @Parameter(description = "User2 ID") @PathVariable UUID user2Id,
            Locale locale) {
        CoupleResponse couple = coupleService.getCoupleByIds(user1Id, user2Id);
        return AppApiResponse.<CoupleResponse>builder()
                .code(200)
                .message(messageSource.getMessage("couple.get.success", null, locale))
                .result(couple)
                .build();
    }

    @Operation(summary = "Create a new couple", description = "Create a new couple with the provided details")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Couple created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid couple data")
    })
    @PostMapping
    public AppApiResponse<CoupleResponse> createCouple(
            @Valid @RequestBody CoupleRequest request,
            Locale locale) {
        CoupleResponse couple = coupleService.createCouple(request);
        return AppApiResponse.<CoupleResponse>builder()
                .code(201)
                .message(messageSource.getMessage("couple.created.success", null, locale))
                .result(couple)
                .build();
    }

    @Operation(summary = "Update a couple", description = "Update an existing couple by user1Id and user2Id")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Couple updated successfully"),
            @ApiResponse(responseCode = "404", description = "Couple not found"),
            @ApiResponse(responseCode = "400", description = "Invalid couple data")
    })
    @PutMapping("/{user1Id}/{user2Id}")
    public AppApiResponse<CoupleResponse> updateCouple(
            @Parameter(description = "User1 ID") @PathVariable UUID user1Id,
            @Parameter(description = "User2 ID") @PathVariable UUID user2Id,
            @Valid @RequestBody CoupleRequest request,
            Locale locale) {
        CoupleResponse couple = coupleService.updateCouple(user1Id, user2Id, request);
        return AppApiResponse.<CoupleResponse>builder()
                .code(200)
                .message(messageSource.getMessage("couple.updated.success", null, locale))
                .result(couple)
                .build();
    }

    @Operation(summary = "Delete a couple", description = "Soft delete a couple by user1Id and user2Id")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Couple deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Couple not found")
    })
    @DeleteMapping("/{user1Id}/{user2Id}")
    public AppApiResponse<Void> deleteCouple(
            @Parameter(description = "User1 ID") @PathVariable UUID user1Id,
            @Parameter(description = "User2 ID") @PathVariable UUID user2Id,
            Locale locale) {
        coupleService.deleteCouple(user1Id, user2Id);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("couple.deleted.success", null, locale))
                .build();
    }
}