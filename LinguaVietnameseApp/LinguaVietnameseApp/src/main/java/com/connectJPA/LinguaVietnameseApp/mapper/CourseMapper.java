package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Course;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface CourseMapper {
    Course toEntity(CourseRequest request);

    @Mapping(target = "latestDraftVersion", ignore = true)
    CourseResponse toResponse(Course course);

    @Mapping(target = "courseId", ignore = true)
    @Mapping(target = "creatorId", ignore = true)
    void updateEntityFromRequest(CourseRequest request, @MappingTarget Course course);
}