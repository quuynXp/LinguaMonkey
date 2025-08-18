package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonProgressWrongItemRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonProgressWrongItemResponse;
import com.connectJPA.LinguaVietnameseApp.entity.LessonProgressWrongItem;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring")
public interface LessonProgressWrongItemMapper {
    LessonProgressWrongItemMapper INSTANCE = Mappers.getMapper(LessonProgressWrongItemMapper.class);

    LessonProgressWrongItem toEntity(LessonProgressWrongItemRequest request);
    LessonProgressWrongItemResponse toResponse(LessonProgressWrongItem entity);
    void updateEntityFromRequest(LessonProgressWrongItemRequest request, @MappingTarget LessonProgressWrongItem entity);
}