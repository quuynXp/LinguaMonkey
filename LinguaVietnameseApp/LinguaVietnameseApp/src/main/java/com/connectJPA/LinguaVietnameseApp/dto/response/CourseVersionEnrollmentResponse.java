package com.connectJPA.LinguaVietnameseApp.dto.response;



import lombok.AllArgsConstructor;

import lombok.Builder;

import lombok.Data;

import lombok.NoArgsConstructor;



import java.time.OffsetDateTime;

import java.util.UUID;



@Data

@Builder

@NoArgsConstructor

@AllArgsConstructor

public class CourseVersionEnrollmentResponse {

    private UUID enrollmentId;

    private UUID userId;

    private OffsetDateTime enrolledAt;

    private CourseResponse course;

    private CourseVersionResponse courseVersion;
    
    private int progress;

}