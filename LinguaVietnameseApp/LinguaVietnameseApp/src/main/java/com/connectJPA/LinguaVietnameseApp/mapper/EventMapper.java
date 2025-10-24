package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.EventRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.LanguageRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.EventResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.LanguageResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Event;
import com.connectJPA.LinguaVietnameseApp.entity.Language;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring")
public interface EventMapper {
    Event toEntity(EventRequest request);
    EventResponse toResponse(Event event);
    void updateEntityFromRequest(EventRequest request, @MappingTarget Event event);
}
