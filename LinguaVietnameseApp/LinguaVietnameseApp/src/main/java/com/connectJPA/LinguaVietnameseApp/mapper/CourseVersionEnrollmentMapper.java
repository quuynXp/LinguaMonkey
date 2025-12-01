package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseVersionEnrollmentRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseVersionEnrollmentResponse;
import com.connectJPA.LinguaVietnameseApp.entity.CourseVersionEnrollment;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring")
public interface CourseVersionEnrollmentMapper {

    CourseVersionEnrollment toEntity(CourseVersionEnrollmentRequest request);
    CourseVersionEnrollmentResponse toResponse(CourseVersionEnrollment enrollment);
    void updateEntityFromRequest(CourseVersionEnrollmentRequest request, @MappingTarget CourseVersionEnrollment enrollment);
}