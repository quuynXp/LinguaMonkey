package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.Character3dRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.Character3dResponse;
import com.connectJPA.LinguaVietnameseApp.service.Character3dService;
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
@RequestMapping("/api/character3ds")
@RequiredArgsConstructor
public class Character3dController {
    private final Character3dService character3dService;
    private final MessageSource messageSource;

    @Operation(summary = "Get all 3D characters", description = "Retrieve a paginated list of 3D characters with optional filtering by character3dName")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved 3D characters"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters")
    })
    @GetMapping
    public AppApiResponse<Page<Character3dResponse>> getAllCharacter3ds(
            @Parameter(description = "Character name filter") @RequestParam(required = false) String character3dName,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        Page<Character3dResponse> characters = character3dService.getAllCharacter3ds(character3dName, pageable);
        return AppApiResponse.<Page<Character3dResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("character3d.list.success", null, locale))
                .result(characters)
                .build();
    }

    @Operation(summary = "Get 3D character by ID", description = "Retrieve a 3D character by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved 3D character"),
            @ApiResponse(responseCode = "404", description = "3D character not found")
    })
    @GetMapping("/{id}")
    public AppApiResponse<Character3dResponse> getCharacter3dById(
            @Parameter(description = "Character3d ID") @PathVariable UUID id,
            Locale locale) {
        Character3dResponse character = character3dService.getCharacter3dById(id);
        return AppApiResponse.<Character3dResponse>builder()
                .code(200)
                .message(messageSource.getMessage("character3d.get.success", null, locale))
                .result(character)
                .build();
    }

    @Operation(summary = "Create a new 3D character", description = "Create a new 3D character with the provided details")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "3D character created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid 3D character data")
    })
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @PostMapping
    public AppApiResponse<Character3dResponse> createCharacter3d(
            @Valid @RequestBody Character3dRequest request,
            Locale locale) {
        Character3dResponse character = character3dService.createCharacter3d(request);
        return AppApiResponse.<Character3dResponse>builder()
                .code(201)
                .message(messageSource.getMessage("character3d.created.success", null, locale))
                .result(character)
                .build();
    }

    @Operation(summary = "Update a 3D character", description = "Update an existing 3D character by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "3D character updated successfully"),
            @ApiResponse(responseCode = "404", description = "3D character not found"),
            @ApiResponse(responseCode = "400", description = "Invalid 3D character data")
    })
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @PutMapping("/{id}")
    public AppApiResponse<Character3dResponse> updateCharacter3d(
            @Parameter(description = "Character3d ID") @PathVariable UUID id,
            @Valid @RequestBody Character3dRequest request,
            Locale locale) {
        Character3dResponse character = character3dService.updateCharacter3d(id, request);
        return AppApiResponse.<Character3dResponse>builder()
                .code(200)
                .message(messageSource.getMessage("character3d.updated.success", null, locale))
                .result(character)
                .build();
    }

    @Operation(summary = "Delete a 3D character", description = "Soft delete a 3D character by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "3D character deleted successfully"),
            @ApiResponse(responseCode = "404", description = "3D character not found")
    })
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @DeleteMapping("/{id}")
    public AppApiResponse<Void> deleteCharacter3d(
            @Parameter(description = "Character3d ID") @PathVariable UUID id,
            Locale locale) {
        character3dService.deleteCharacter3d(id);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("character3d.deleted.success", null, locale))
                .build();
    }
}