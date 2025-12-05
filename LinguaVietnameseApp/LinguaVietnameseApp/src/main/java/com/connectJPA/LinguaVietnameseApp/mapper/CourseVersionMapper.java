package com.connectJPA.LinguaVietnameseApp.mapper;

import com.connectJPA.LinguaVietnameseApp.dto.response.CourseVersionResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.LessonSummaryResponse;
import com.connectJPA.LinguaVietnameseApp.entity.CourseVersion;
import com.connectJPA.LinguaVietnameseApp.entity.CourseVersionLesson;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring")
public interface CourseVersionMapper {

    @Mapping(target = "courseId", source = "course.courseId")
    @Mapping(target = "lessons", expression = "java(mapLessons(entity.getLessons()))")
    CourseVersionResponse toResponse(CourseVersion entity);

    default List<LessonSummaryResponse> mapLessons(List<CourseVersionLesson> lessons) {
        if (lessons == null) {
            return null;
        }
        return lessons.stream()
                .sorted(Comparator.comparingInt(CourseVersionLesson::getOrderIndex))
                .map(this::cvlToLessonSummary)
                .collect(Collectors.toList());
    }

    @Mapping(target = "lessonId", source = "lesson.lessonId")
    @Mapping(target = "title", source = "lesson.title")
    @Mapping(target = "orderIndex", source = "orderIndex")
    LessonSummaryResponse cvlToLessonSummary(CourseVersionLesson cvl);
}