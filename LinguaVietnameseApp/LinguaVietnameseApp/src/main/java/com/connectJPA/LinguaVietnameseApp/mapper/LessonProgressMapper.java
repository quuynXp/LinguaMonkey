package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonProgressRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonProgressResponse;
import com.connectJPA.LinguaVietnameseApp.entity.LessonProgress;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring")
public interface LessonProgressMapper {

    LessonProgress toEntity(LessonProgressRequest request);
    LessonProgressResponse toResponse(LessonProgress entity);
    void updateEntityFromRequest(LessonProgressRequest request, @MappingTarget LessonProgress entity);
}