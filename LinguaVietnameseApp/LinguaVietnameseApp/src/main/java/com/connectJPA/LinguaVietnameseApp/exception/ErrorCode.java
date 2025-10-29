package com.connectJPA.LinguaVietnameseApp.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    // ===== 400 Bad Request =====
    MISSING_REQUIRED_FIELD(1000, "error.missing_required_field", HttpStatus.BAD_REQUEST),
    INVALID_USER_INFO(1001, "error.invalid_user_info", HttpStatus.BAD_REQUEST),
    INVALID_KEY(1002, "error.invalid_key", HttpStatus.BAD_REQUEST),
    INVALID_TOKEN_FORMAT(1003, "error.invalid_token_format", HttpStatus.BAD_REQUEST),
    MAX_SESSIONS_EXCEEDED(1004, "error.max_sessions_exceeded", HttpStatus.BAD_REQUEST),
    REQUEST_BODY_INVALID(1005, "error.request_body_invalid", HttpStatus.BAD_REQUEST),
    REQUEST_PARAM_MISSING(1006, "error.request_param_missing", HttpStatus.BAD_REQUEST),
    VALIDATION_FAILED(1007, "error.validation_failed", HttpStatus.BAD_REQUEST),
    EMAIL_SENDING_FAILED(1008, "error.email_sending_failed", HttpStatus.BAD_REQUEST),
    INVALID_SIGNATURE(1009, "error.invalid_webhook_signature", HttpStatus.BAD_REQUEST),
    INVALID_PAYMENT_PROVIDER(1010, "error.invalid_payment_provider", HttpStatus.BAD_REQUEST),
    PAYMENT_PROCESSING_FAILED(1011, "error.payment_processing_failed", HttpStatus.BAD_REQUEST),
    EXCEEDS_MAX_MEMBERS(1012, "error.exceeds_max_members", HttpStatus.BAD_REQUEST),
    INVALID_INPUT(1013, "error.invalid_input", HttpStatus.BAD_REQUEST),
    INVALID_PAGEABLE(1014, "error.invalid_pageable", HttpStatus.BAD_REQUEST),
    INVALID_FILE_FORMAT(1015, "error.invalid_file_format", HttpStatus.BAD_REQUEST),
    FILE_UPLOAD_FAILED(1016, "error.file_upload_failed", HttpStatus.BAD_REQUEST),
    INVALID_URL(1017, "error.invalid_url", HttpStatus.BAD_REQUEST),
    AI_PROCESSING_FAILED(1018, "error.ai_processing_failed", HttpStatus.BAD_REQUEST),
    EMAIL_ALREADY_EXISTS(1019, "error.email_already_exists", HttpStatus.BAD_REQUEST),
    EMAIL_SEND_FAILED(1020, "error.email_send_failed", HttpStatus.BAD_REQUEST),
    RESET_TOKEN_INVALID(1021, "error.reset_token_invalid", HttpStatus.BAD_REQUEST),
    INVALID_COURSE_TYPE(1022, "error.invalid_course_type", HttpStatus.BAD_REQUEST),
    INVALID_REQUEST(1023, "error.invalid_request", HttpStatus.BAD_REQUEST),
    GRAMMAR_TOPIC_NOT_FOUND(1023, "error.invalid_request", HttpStatus.BAD_REQUEST),
    GRAMMAR_RULE_NOT_FOUND(1023, "error.invalid_request", HttpStatus.BAD_REQUEST),
    GRAMMAR_EXERCISES_NOT_FOUND(1023, "error.invalid_request", HttpStatus.BAD_REQUEST),
    // ===== 401 Unauthorized =====
    UNAUTHENTICATED(2000, "error.unauthenticated", HttpStatus.UNAUTHORIZED),
    TOKEN_EXPIRED(2001, "error.token_expired", HttpStatus.UNAUTHORIZED),
    TOKEN_INVALID(2002, "error.token_invalid", HttpStatus.UNAUTHORIZED),
    TOKEN_SIGNATURE_INVALID(2003, "error.token_signature_invalid", HttpStatus.UNAUTHORIZED),
    TOKEN_REVOKED(2004, "error.token_revoked", HttpStatus.UNAUTHORIZED),
    REFRESH_TOKEN_EXPIRED(2005, "error.refresh_token_expired", HttpStatus.UNAUTHORIZED),
    REFRESH_TOKEN_INVALID(2006, "error.refresh_token_invalid", HttpStatus.UNAUTHORIZED),
    REFRESH_TOKEN_DEVICE_MISMATCH(2007, "error.refresh_token_device_mismatch", HttpStatus.UNAUTHORIZED),
    FIREBASE_TOKEN_VERIFICATION_FAILED(2008, "error.firebase_token_verification_failed", HttpStatus.UNAUTHORIZED),
    REFRESH_TOKEN_NOT_FOUND(2009, "error.refresh_token_not_found", HttpStatus.UNAUTHORIZED),
    INVALID_PASSWORD(2010, "error.invalid_password", HttpStatus.UNAUTHORIZED),
    OTP_INVALID(2010, "error.invalid_password", HttpStatus.UNAUTHORIZED),
    OTP_EXPIRED(2010, "error.invalid_password", HttpStatus.UNAUTHORIZED),
    SOCIAL_USER_INFO_INVALID(2010, "error.invalid_password", HttpStatus.UNAUTHORIZED),
    GOOGLE_TOKEN_INVALID(2010, "error.invalid_password", HttpStatus.UNAUTHORIZED),
    FACEBOOK_TOKEN_INVALID(2010, "error.invalid_password", HttpStatus.UNAUTHORIZED),
    SMS_SERVICE_NOT_CONFIGURED(2010, "error.invalid_password", HttpStatus.UNAUTHORIZED),
    SMS_SEND_FAILED(2010, "error.invalid_password", HttpStatus.UNAUTHORIZED),



    // ===== 403 Forbidden =====
    UNAUTHORIZED(3000, "error.unauthorized", HttpStatus.FORBIDDEN),
    NOT_ROOM_MEMBER(3001, "error.not_room_member", HttpStatus.FORBIDDEN),
    NOT_ROOM_CREATOR(3002, "error.not_room_creator", HttpStatus.FORBIDDEN),
    NOT_GROUP_CHAT(3003, "error.not_group_chat", HttpStatus.FORBIDDEN),
    ROOM_PURPOSE_MISMATCH(3004, "error.room_purpose_mismatch", HttpStatus.FORBIDDEN),

    // ===== 404 Not Found =====
    USER_NOT_FOUND(4000, "error.user_not_found", HttpStatus.NOT_FOUND),
    FILE_NOT_FOUND(4001, "error.file_not_found", HttpStatus.NOT_FOUND),
    LESSON_NOT_FOUND(4002, "error.lesson_not_found", HttpStatus.NOT_FOUND),
    CERTIFICATE_NOT_FOUND(4003, "error.certificate_not_found", HttpStatus.NOT_FOUND),
    LESSON_QUESTION_NOT_FOUND(4004, "error.lesson_question_not_found", HttpStatus.NOT_FOUND),
    LESSON_PROGRESS_WRONG_ITEM_NOT_FOUND(4005, "error.lesson_progress_wrong_item_not_found", HttpStatus.NOT_FOUND),
    LESSON_PROGRESS_NOT_FOUND(4006, "error.lesson_progress_not_found", HttpStatus.NOT_FOUND),
    LESSON_ORDER_IN_SERIES_NOT_FOUND(4007, "error.lesson_order_in_series_not_found", HttpStatus.NOT_FOUND),
    LESSON_CATEGORY_NOT_FOUND(4008, "error.lesson_category_not_found", HttpStatus.NOT_FOUND),
    LESSON_SUB_CATEGORY_NOT_FOUND(4009, "error.lesson_sub_category_not_found", HttpStatus.NOT_FOUND),
    LESSON_SERIES_NOT_FOUND(4010, "error.lesson_series_not_found", HttpStatus.NOT_FOUND),
    LANGUAGE_NOT_FOUND(4011, "error.language_not_found", HttpStatus.NOT_FOUND),
    GROUP_SESSION_NOT_FOUND(4012, "error.group_session_not_found", HttpStatus.NOT_FOUND),
    GROUP_ANSWER_NOT_FOUND(4013, "error.group_answer_not_found", HttpStatus.NOT_FOUND),
    PERMISSION_NOT_FOUND(4014, "error.permission_not_found", HttpStatus.NOT_FOUND),
    ROLE_NOT_FOUND(4015, "error.role_not_found", HttpStatus.NOT_FOUND),
    ROOM_NOT_FOUND(4016, "error.room_not_found", HttpStatus.NOT_FOUND),
    TRANSACTION_NOT_FOUND(4017, "error.transaction_not_found", HttpStatus.NOT_FOUND),
    FRIENDSHIP_NOT_FOUND(4018, "error.friendship_not_found", HttpStatus.NOT_FOUND),
    EVENT_NOT_FOUND(4019, "error.event_not_found", HttpStatus.NOT_FOUND),
    VIDEO_CALL_NOT_FOUND(4020, "error.video_call_not_found", HttpStatus.NOT_FOUND),
    NOTIFICATION_NOT_FOUND(4021, "error.notification_not_found", HttpStatus.NOT_FOUND),
    LEADERBOARD_NOT_FOUND(4022, "error.leaderboard_not_found", HttpStatus.NOT_FOUND),
    LEADERBOARD_ENTRY_NOT_FOUND(4023, "error.leaderboard_entry_not_found", HttpStatus.NOT_FOUND),
    BADGE_NOT_FOUND(4024, "error.badge_not_found", HttpStatus.NOT_FOUND),
    CHARACTER3D_NOT_FOUND(4025, "error.character3d_not_found", HttpStatus.NOT_FOUND),
    CHAT_MESSAGE_NOT_FOUND(4026, "error.chat_message_not_found", HttpStatus.NOT_FOUND),
    COUPLE_NOT_FOUND(4027, "error.couple_not_found", HttpStatus.NOT_FOUND),
    COURSE_NOT_FOUND(4028, "error.course_not_found", HttpStatus.NOT_FOUND),
    COURSE_DISCOUNT_NOT_FOUND(4029, "error.course_discount_not_found", HttpStatus.NOT_FOUND),
    COURSE_ENROLLMENT_NOT_FOUND(4030, "error.course_enrollment_not_found", HttpStatus.NOT_FOUND),
    COURSE_LESSON_NOT_FOUND(4031, "error.course_lesson_not_found", HttpStatus.NOT_FOUND),
    COURSE_REVIEW_NOT_FOUND(4032, "error.course_review_not_found", HttpStatus.NOT_FOUND),
    MEMORIZATION_NOT_FOUND(4033, "error.memorization_not_found", HttpStatus.NOT_FOUND),
    VIDEO_NOT_FOUND(4034, "error.video_not_found", HttpStatus.NOT_FOUND),
    ROADMAP_NOT_FOUND(4035, "error.roadmap_not_found", HttpStatus.NOT_FOUND),
    ROADMAP_ITEM_NOT_FOUND(4036, "error.roadmap_item_not_found", HttpStatus.NOT_FOUND),
    ROADMAP_NOT_ASSIGNED(4037, "error.roadmap_not_assigned", HttpStatus.NOT_FOUND),
    PARTICIPANT_NOT_FOUND(4038, "error.participant_not_found", HttpStatus.NOT_FOUND),

    // ===== 405 Method Not Allowed =====
    METHOD_NOT_ALLOWED(7000, "error.method_not_allowed", HttpStatus.METHOD_NOT_ALLOWED),

    // ===== 415 Unsupported Media Type =====
    UNSUPPORTED_MEDIA_TYPE(7001, "error.unsupported_media_type", HttpStatus.UNSUPPORTED_MEDIA_TYPE),

    // ===== 500 Internal Server Error =====
    FILE_PROCESSING_ERROR(5000, "error.file_processing_failed", HttpStatus.INTERNAL_SERVER_ERROR),
    TOKEN_GENERATION_FAILED(5001, "error.token_generation_failed", HttpStatus.INTERNAL_SERVER_ERROR),
    SESSION_LOG_CREATION_FAILED(5002, "error.session_log_creation_failed", HttpStatus.INTERNAL_SERVER_ERROR),
    UNCATEGORIZED_EXCEPTION(5003, "error.uncategorized_exception", HttpStatus.INTERNAL_SERVER_ERROR),

    // ===== 503 Service Unavailable =====
    REDIS_CONNECTION_FAILED(6000, "error.redis_connection_failed", HttpStatus.SERVICE_UNAVAILABLE);

    private final int code;
    private final String message;
    private final HttpStatus statusCode;

    ErrorCode(int code, String message, HttpStatus statusCode) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }
}
