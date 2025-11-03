package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.EventRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AppApiResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.EventResponse;
import com.connectJPA.LinguaVietnameseApp.service.EventService;
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
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
public class EventController {
    private final EventService eventService;
    private final MessageSource messageSource;

    @Operation(summary = "Get all events", description = "Retrieve a paginated list of events with optional filtering by eventType")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved events"),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters")
    })
    @GetMapping
    public AppApiResponse<Page<EventResponse>> getAllEvents(
            @Parameter(description = "Event type filter") @RequestParam(required = false) String eventType,
            @Parameter(description = "Pagination and sorting") Pageable pageable,
            Locale locale) {
        Page<EventResponse> events = eventService.getAllEvents(eventType, pageable);
        return AppApiResponse.<Page<EventResponse>>builder()
                .code(200)
                .message(messageSource.getMessage("event.list.success", null, locale))
                .result(events)
                .build();
    }

    @Operation(summary = "Get event by ID", description = "Retrieve an event by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved event"),
            @ApiResponse(responseCode = "404", description = "Event not found")
    })
    @GetMapping("/{id}")
    public AppApiResponse<EventResponse> getEventById(
            @Parameter(description = "Event ID") @PathVariable UUID id,
            Locale locale) {
        EventResponse event = eventService.getEventById(id);
        return AppApiResponse.<EventResponse>builder()
                .code(200)
                .message(messageSource.getMessage("event.get.success", null, locale))
                .result(event)
                .build();
    }

    @Operation(summary = "Create a new event", description = "Create a new event with the provided details")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Event created successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid event data")
    })
    @PostMapping
    public AppApiResponse<EventResponse> createEvent(
            @Valid @RequestBody EventRequest request,
            Locale locale) {
        EventResponse event = eventService.createEvent(request);
        return AppApiResponse.<EventResponse>builder()
                .code(201)
                .message(messageSource.getMessage("event.created.success", null, locale))
                .result(event)
                .build();
    }

    @Operation(summary = "Update an event", description = "Update an existing event by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Event updated successfully"),
            @ApiResponse(responseCode = "404", description = "Event not found"),
            @ApiResponse(responseCode = "400", description = "Invalid event data")
    })
    @PutMapping("/{id}")
    public AppApiResponse<EventResponse> updateEvent(
            @Parameter(description = "Event ID") @PathVariable UUID id,
            @Valid @RequestBody EventRequest request,
            Locale locale) {
        EventResponse event = eventService.updateEvent(id, request);
        return AppApiResponse.<EventResponse>builder()
                .code(200)
                .message(messageSource.getMessage("event.updated.success", null, locale))
                .result(event)
                .build();
    }

    @Operation(summary = "Delete an event", description = "Soft delete an event by its ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Event deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Event not found")
    })
    @DeleteMapping("/{id}")
    public AppApiResponse<Void> deleteEvent(
            @Parameter(description = "Event ID") @PathVariable UUID id,
            Locale locale) {
        eventService.deleteEvent(id);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message(messageSource.getMessage("event.deleted.success", null, locale))
                .build();
    }
}