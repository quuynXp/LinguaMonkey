package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.request.LessonQuestionRequest;
import com.connectJPA.LinguaVietnameseApp.dto.request.LessonRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonQuestionResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonResponse;
import com.connectJPA.LinguaVietnameseApp.entity.Lesson;
import com.connectJPA.LinguaVietnameseApp.entity.LessonQuestion;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring")
public interface LessonMapper {

    @Mapping(target = "optionsJson", source = "optionsJson")
    @Mapping(target = "mediaUrl", source = "mediaUrl")
    @Mapping(target = "transcript", source = "transcript")
    @Mapping(target = "explainAnswer", source = "explainAnswer")
    @Mapping(target = "skillType", source = "skillType")
    LessonQuestionResponse toQuestionResponse(LessonQuestion entity);

    @Mapping(target = "lessonQuestionId", ignore = true)
    @Mapping(target = "lesson", ignore = true) // Sẽ set thủ công trong service
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    LessonQuestion toQuestionEntity(LessonQuestionRequest request);
    
    Lesson toEntity(LessonRequest request);
    LessonResponse toResponse(Lesson lesson);
    void updateEntityFromRequest(LessonRequest request, @MappingTarget Lesson lesson);
}