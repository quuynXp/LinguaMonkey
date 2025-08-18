package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonSubCategoryRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonSubCategoryResponse;
import com.connectJPA.LinguaVietnameseApp.entity.LessonSubCategory;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring")
public interface LessonSubCategoryMapper {
    LessonSubCategoryMapper INSTANCE = Mappers.getMapper(LessonSubCategoryMapper.class);

    LessonSubCategory toEntity(LessonSubCategoryRequest request);
    LessonSubCategoryResponse toResponse(LessonSubCategory entity);
    void updateEntityFromRequest(LessonSubCategoryRequest request, @MappingTarget LessonSubCategory entity);
}