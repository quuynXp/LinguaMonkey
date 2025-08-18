package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonSeriesRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonSeriesResponse;
import com.connectJPA.LinguaVietnameseApp.entity.LessonSeries;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring")
public interface LessonSeriesMapper {
    LessonSeriesMapper INSTANCE = Mappers.getMapper(LessonSeriesMapper.class);

    LessonSeries toEntity(LessonSeriesRequest request);
    LessonSeriesResponse toResponse(LessonSeries entity);
    void updateEntityFromRequest(LessonSeriesRequest request, @MappingTarget LessonSeries entity);
}