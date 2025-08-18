package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.EventRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.EventResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface EventService {
    Page<EventResponse> getAllEvents(String eventType, Pageable pageable);
    EventResponse getEventById(UUID id);
    EventResponse createEvent(EventRequest request);
    EventResponse updateEvent(UUID id, EventRequest request);
    void deleteEvent(UUID id);
}