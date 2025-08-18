package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonCategoryRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonCategoryResponse;
import com.connectJPA.LinguaVietnameseApp.entity.LessonCategory;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring")
public interface LessonCategoryMapper {
    LessonCategoryMapper INSTANCE = Mappers.getMapper(LessonCategoryMapper.class);

    LessonCategory toEntity(LessonCategoryRequest request);
    LessonCategoryResponse toResponse(LessonCategory entity);
    void updateEntityFromRequest(LessonCategoryRequest request, @MappingTarget LessonCategory entity);
}