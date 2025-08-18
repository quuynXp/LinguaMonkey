package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonOrderInSeriesRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonOrderInSeriesResponse;
import com.connectJPA.LinguaVietnameseApp.entity.LessonOrderInSeries;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring")
public interface LessonOrderInSeriesMapper {
    LessonOrderInSeriesMapper INSTANCE = Mappers.getMapper(LessonOrderInSeriesMapper.class);

    LessonOrderInSeries toEntity(LessonOrderInSeriesRequest request);
    LessonOrderInSeriesResponse toResponse(LessonOrderInSeries entity);
    void updateEntityFromRequest(LessonOrderInSeriesRequest request, @MappingTarget LessonOrderInSeries entity);
}