package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.response.*;
import com.connectJPA.LinguaVietnameseApp.entity.*;
import com.connectJPA.LinguaVietnameseApp.mapper.*;
import com.connectJPA.LinguaVietnameseApp.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
public class SearchController {

    private final UserService userService;
    private final CourseService courseService;
    private final LessonService lessonService;
    private final NotificationService notificationService;
    private final UserMemorizationService userMemorizationService;
    private final ChatMessageService chatMessageService;

    private final UserMapper userMapper;
    private final ChatMessageMapper chatMessageMapper;
    private final CourseMapper courseMapper;
    private final LessonMapper lessonMapper;
    private final NotificationMapper notificationMapper;
    private final UserMemorizationMapper userMemorizationMapper;

    @GetMapping("/users")
    public Page<UserResponse> searchUsers(@RequestParam String keyword, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
        Page<User> users = userService.searchUsers(keyword, page, size);
        return users.map(userMapper::toResponse);
    }

    @GetMapping("/messages")
    public Page<ChatMessageResponse> searchMessages(
            @RequestParam String keyword,
            @RequestParam(required = false) UUID roomId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<ChatMessage> messages = chatMessageService.searchMessages(keyword, roomId, page, size);
        return messages.map(chatMessageMapper::toResponse);
    }

    @GetMapping("/courses")
    public Page<CourseResponse> searchCourses(@RequestParam String keyword, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
        Page<Course> courses = courseService.searchCourses(keyword, page, size, null);
        return courses.map(courseMapper::toResponse);
    }

    @GetMapping("/lessons")
    public Page<LessonResponse> searchLessons(@RequestParam String keyword, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
        Page<Lesson> lessons = lessonService.searchLessons(keyword, page, size, null);
        return lessons.map(lessonMapper::toResponse);
    }

    @GetMapping("/notifications")
    public Page<NotificationResponse> searchNotifications(@RequestParam String keyword, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
        Page<Notification> notifications = notificationService.searchNotifications(keyword, page, size, null);
        return notifications.map(notificationMapper::toResponse);
    }

    // @GetMapping("/memorizations")
    // public Page<MemorizationResponse> searchMemorizations(@RequestParam String keyword, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
    //     Page<MemorizationResponse> memorizations = userMemorizationService.searchMemorizations(keyword, page, size, null);
    //     return memorizations.map(userMemorizationMapper::toResponse);
    // }
}