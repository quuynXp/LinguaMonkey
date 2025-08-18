package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.GroupAnswerRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.GroupAnswerResponse;
import com.connectJPA.LinguaVietnameseApp.service.GroupAnswerService;
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
@RequestMapping("/api/group-answers")
@RequiredArgsConstructor
public class GroupAnswerController {
    private final GroupAnswerService groupAnswerService;
    private final MessageSource messageSource;

    @Operation(summary = "Get all group answers", description = "Retrieve a paginated list of group answers with optional filtering by groupSessionId or userId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved group answers"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters")
    })
    @GetMapping
    public AppApiResponse<Page<GroupAnswerResponse>> getAllGroupAnswers(
            @Parameter(description = "Group session ID filter") @RequestParam(required = false) String groupSessionId,
            @Parameter(description = "User ID filter") @RequestParam(required = false) String userId,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        Page<GroupAnswerResponse> answers = groupAnswerService.getAllGroupAnswers(groupSessionId, userId, pageable);
        return AppApiResponse.<Page<GroupAnswerResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("groupAnswer.list.success", null, locale))
                .result(answers)
                .build();
    }

    @Operation(summary = "Get group answer by IDs", description = "Retrieve a group answer by groupSessionId and userId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved group answer"),
            @ApiResponse(responseCode = "404", description = "Group answer not found")
    })
    @GetMapping("/{groupSessionId}/{userId}")
    public AppApiResponse<GroupAnswerResponse> getGroupAnswerByIds(
            @Parameter(description = "Group session ID") @PathVariable UUID groupSessionId,
            @Parameter(description = "User ID") @PathVariable UUID userId,
            Locale locale) {
        GroupAnswerResponse answer = groupAnswerService.getGroupAnswerByIds(groupSessionId, userId);
        return AppApiResponse.<GroupAnswerResponse>builder()
                .code(200)
                .message(messageSource.getMessage("groupAnswer.get.success", null, locale))
                .result(answer)
                .build();
    }

    @Operation(summary = "Create a new group answer", description = "Create a new group answer with the provided details")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Group answer created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid group answer data")
    })
    @PostMapping
    public AppApiResponse<GroupAnswerResponse> createGroupAnswer(
            @Valid @RequestBody GroupAnswerRequest request,
            Locale locale) {
        GroupAnswerResponse answer = groupAnswerService.createGroupAnswer(request);
        return AppApiResponse.<GroupAnswerResponse>builder()
                .code(201)
                .message(messageSource.getMessage("groupAnswer.created.success", null, locale))
                .result(answer)
                .build();
    }

    @Operation(summary = "Update a group answer", description = "Update an existing group answer by groupSessionId and userId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Group answer updated successfully"),
            @ApiResponse(responseCode = "404", description = "Group answer not found"),
            @ApiResponse(responseCode = "400", description = "Invalid group answer data")
    })
    @PutMapping("/{groupSessionId}/{userId}")
    public AppApiResponse<GroupAnswerResponse> updateGroupAnswer(
            @Parameter(description = "Group session ID") @PathVariable UUID groupSessionId,
            @Parameter(description = "User ID") @PathVariable UUID userId,
            @Valid @RequestBody GroupAnswerRequest request,
            Locale locale) {
        GroupAnswerResponse answer = groupAnswerService.updateGroupAnswer(groupSessionId, userId, request);
        return AppApiResponse.<GroupAnswerResponse>builder()
                .code(200)
                .message(messageSource.getMessage("groupAnswer.updated.success", null, locale))
                .result(answer)
                .build();
    }

    @Operation(summary = "Delete a group answer", description = "Soft delete a group answer by groupSessionId and userId")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Group answer deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Group answer not found")
    })
    @DeleteMapping("/{groupSessionId}/{userId}")
    public AppApiResponse<Void> deleteGroupAnswer(
            @Parameter(description = "Group session ID") @PathVariable UUID groupSessionId,
            @Parameter(description = "User ID") @PathVariable UUID userId,
            Locale locale) {
        groupAnswerService.deleteGroupAnswer(groupSessionId, userId);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("groupAnswer.deleted.success", null, locale))
                .build();
    }
}