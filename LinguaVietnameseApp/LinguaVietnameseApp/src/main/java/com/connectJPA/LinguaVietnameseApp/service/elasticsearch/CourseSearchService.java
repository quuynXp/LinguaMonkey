// package com.connectJPA.LinguaVietnameseApp.service.elasticsearch;

// import com.connectJPA.LinguaVietnameseApp.entity.Course;
// import lombok.RequiredArgsConstructor;
// import org.springframework.data.domain.Page;
// import org.springframework.stereotype.Service;

// import java.util.List;
// import java.util.Map;

// @Service
// @RequiredArgsConstructor
// public class CourseSearchService {
//     private final ElasticSearchService elasticSearchService;
//     private static final List<String> SEARCH_FIELDS = List.of("title", "description");

//     public Page<Course> searchCourses(String keyword, int page, int size, Map<String, Object> filters) {
//         return elasticSearchService.search(Course.class, keyword, SEARCH_FIELDS, filters, page, size);
//     }

//     public void indexCourse(Course course) { elasticSearchService.index(course); }
//     public void deleteCourse(Course course) { elasticSearchService.delete(course); }
// }

