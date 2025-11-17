package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.entity.*;
import com.connectJPA.LinguaVietnameseApp.service.elasticsearch.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
public class SearchController {

    private final UserSearchService userSearchService;
    private final CourseSearchService courseSearchService;
    private final LessonSearchService lessonSearchService;
    private final NotificationSearchService notificationSearchService;
    private final UserMemorizationSearchService userMemorizationSearchService;
    private final ChatMessageSearchService chatMessageSearchService;

    @GetMapping("/users")
    public Page<User> searchUsers(@RequestParam String keyword,
                                  @RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "10") int size) {
        return userSearchService.searchUsers(keyword, page, size);
    }

    @GetMapping("/messages")
    public Page<ChatMessage> searchMessages(
            @RequestParam String keyword,
            @RequestParam(required = false) UUID roomId, // Tùy chọn: lọc theo phòng
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return chatMessageSearchService.searchMessages(keyword, roomId, page, size);
    }

    @GetMapping("/courses")
    public Page<Course> searchCourses(@RequestParam String keyword,
                                      @RequestParam(defaultValue = "0") int page,
                                      @RequestParam(defaultValue = "10") int size) {
        return courseSearchService.searchCourses(keyword, page, size, null);
    }

    @GetMapping("/lessons")
    public Page<Lesson> searchLessons(@RequestParam String keyword,
                                      @RequestParam(defaultValue = "0") int page,
                                      @RequestParam(defaultValue = "10") int size) {
        return lessonSearchService.searchLessons(keyword, page, size, null);
    }

    @GetMapping("/notifications")
    public Page<Notification> searchNotifications(@RequestParam String keyword,
                                                  @RequestParam(defaultValue = "0") int page,
                                                  @RequestParam(defaultValue = "10") int size) {
        return notificationSearchService.searchNotifications(keyword, page, size, null);
    }

    @GetMapping("/memorizations")
    public Page<UserMemorization> searchMemorizations(@RequestParam String keyword,
                                                      @RequestParam(defaultValue = "0") int page,
                                                      @RequestParam(defaultValue = "10") int size) {
        return userMemorizationSearchService.searchMemorizations(keyword, page, size, null);
    }
}

