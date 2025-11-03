package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.BasicLessonRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.BasicLessonResponse;
import com.connectJPA.LinguaVietnameseApp.entity.BasicLesson;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface BasicLessonMapper {

    BasicLesson toEntity(BasicLessonRequest request);

    BasicLessonResponse toResponse(BasicLesson entity);

    void updateEntity(@MappingTarget BasicLesson entity, BasicLessonRequest request);
}
