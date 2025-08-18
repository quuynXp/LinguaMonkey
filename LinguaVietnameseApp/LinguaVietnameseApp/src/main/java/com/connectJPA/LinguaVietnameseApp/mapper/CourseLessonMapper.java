package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseLessonRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseLessonResponse;
import com.connectJPA.LinguaVietnameseApp.entity.CourseLesson;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface CourseLessonMapper {
    CourseLesson toEntity(CourseLessonRequest request);
    CourseLessonResponse toResponse(CourseLesson lesson);
    void updateEntityFromRequest(CourseLessonRequest request, @MappingTarget CourseLesson lesson);
}