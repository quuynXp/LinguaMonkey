package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.CourseEnrollmentRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.CourseEnrollmentResponse;
import com.connectJPA.LinguaVietnameseApp.entity.CourseEnrollment;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring")
public interface CourseEnrollmentMapper {

    CourseEnrollment toEntity(CourseEnrollmentRequest request);
    CourseEnrollmentResponse toResponse(CourseEnrollment enrollment);
    void updateEntityFromRequest(CourseEnrollmentRequest request, @MappingTarget CourseEnrollment enrollment);
}