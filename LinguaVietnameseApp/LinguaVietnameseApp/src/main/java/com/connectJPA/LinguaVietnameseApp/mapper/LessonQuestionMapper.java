package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonQuestionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonQuestionResponse;
import com.connectJPA.LinguaVietnameseApp.entity.LessonQuestion;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring")
public interface LessonQuestionMapper {
    LessonQuestionMapper INSTANCE = Mappers.getMapper(LessonQuestionMapper.class);

    LessonQuestion toEntity(LessonQuestionRequest request);
    LessonQuestionResponse toResponse(LessonQuestion entity);
    void updateEntityFromRequest(LessonQuestionRequest request, @MappingTarget LessonQuestion entity);
}