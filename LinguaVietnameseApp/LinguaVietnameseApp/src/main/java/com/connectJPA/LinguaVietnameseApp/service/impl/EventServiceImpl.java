package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.dto.request.EventRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.EventResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Event;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
import com.connectJPA.LinguaVietnameseApp.mapper.EventMapper;
import com.connectJPA.LinguaVietnameseApp.repository.EventRepository;
import com.connectJPA.LinguaVietnameseApp.service.EventService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventServiceImpl implements EventService {
    private final EventRepository eventRepository;
    private final EventMapper eventMapper;

    @Override
    @Cacheable(value = "events", key = "#eventType + ':' + #pageable.pageNumber + ':' + #pageable.pageSize")
    public Page<EventResponse> getAllEvents(String eventType, Pageable pageable) {
        try {
            if (pageable == null) {
                throw new AppException(ErrorCode.INVALID_PAGEABLE);
            }
            Page<Event> events = eventRepository.findByEventTypeAndIsDeletedFalse(eventType, pageable);
            return events.map(eventMapper::toResponse);
        } catch (Exception e) {
            log.error("Error while fetching all events: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Cacheable(value = "events", key = "#id")
    public EventResponse getEventById(UUID id) {
        try {
            if (id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            Event event = eventRepository.findByEventIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.EVENT_NOT_FOUND));
            return eventMapper.toResponse(event);
        } catch (Exception e) {
            log.error("Error while fetching event by ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CachePut(value = "events", key = "#result.eventId")
    public EventResponse createEvent(EventRequest request) {
        try {
            if (request == null) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            Event event = eventMapper.toEntity(request);
            event = eventRepository.save(event);
            return eventMapper.toResponse(event);
        } catch (Exception e) {
            log.error("Error while creating event: {}", e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CachePut(value = "events", key = "#id")
    public EventResponse updateEvent(UUID id, EventRequest request) {
        try {
            if (id == null || request == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            Event event = eventRepository.findByEventIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.EVENT_NOT_FOUND));
            eventMapper.updateEntityFromRequest(request, event);
            event = eventRepository.save(event);
            return eventMapper.toResponse(event);
        } catch (Exception e) {
            log.error("Error while updating event ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = "events", key = "#id")
    public void deleteEvent(UUID id) {
        try {
            if (id == null) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            Event event = eventRepository.findByEventIdAndIsDeletedFalse(id)
                    .orElseThrow(() -> new AppException(ErrorCode.EVENT_NOT_FOUND));
            eventRepository.softDeleteByEventId(id);
        } catch (Exception e) {
            log.error("Error while deleting event ID {}: {}", id, e.getMessage());
            throw new SystemException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }
}