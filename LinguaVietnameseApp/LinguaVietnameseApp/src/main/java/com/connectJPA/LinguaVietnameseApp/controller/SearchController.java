package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.response.*;
import com.connectJPA.LinguaVietnameseApp.entity.*;
import com.connectJPA.LinguaVietnameseApp.enums.AgeRange;
import com.connectJPA.LinguaVietnameseApp.enums.Country;
import com.connectJPA.LinguaVietnameseApp.mapper.*;
import com.connectJPA.LinguaVietnameseApp.repository.jpa.UserRepository;
import com.connectJPA.LinguaVietnameseApp.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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
    private final ChatMessageService chatMessageService;
    private final UserRepository userRepository;

    private final UserMapper userMapper;
    private final ChatMessageMapper chatMessageMapper;
    private final CourseMapper courseMapper;
    private final LessonMapper lessonMapper;
    private final NotificationMapper notificationMapper;

    @GetMapping("/users")
    public Page<UserResponse> searchUsers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Country country,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) AgeRange ageRange,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Page<User> users = userRepository.searchAdvanced(keyword, country, gender, ageRange, PageRequest.of(page, size));
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

    // @GetMapping("/courses")
    // public Page<CourseResponse> searchCourses(@RequestParam String keyword, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
    //     Page<Course> courses = courseService.searchCourses(keyword, page, size, null);
    //     return courses.map(courseMapper::toResponse);
    // }

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
}