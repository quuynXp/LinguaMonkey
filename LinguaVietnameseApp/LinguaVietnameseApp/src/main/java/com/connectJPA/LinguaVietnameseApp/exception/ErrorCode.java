package com.connectJPA.LinguaVietnameseApp.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {

    // ===== 400 Bad Request (Lỗi từ phía client, an toàn để hiển thị: userFacing=true) =====
    // Nhóm: Validation & Request Chung (10xx)
    EMAIL_SENDING_FAILED(1000, "error.email_sending_failed", HttpStatus.BAD_REQUEST, true),
    BAD_REQUEST(1000, "error.bad_request_generic", HttpStatus.BAD_REQUEST, true),
    ITEM_NOT_FOUND(1000, "error.item_not_found_generic", HttpStatus.BAD_REQUEST, true),
    MISSING_REQUIRED_FIELD(1000, "error.missing_required_field", HttpStatus.BAD_REQUEST, true),
    REQUEST_BODY_INVALID(1001, "error.request_body_invalid", HttpStatus.BAD_REQUEST, true),
    REQUEST_PARAM_MISSING(1002, "error.request_param_missing", HttpStatus.BAD_REQUEST, true),
    VALIDATION_FAILED(1003, "error.validation_failed", HttpStatus.BAD_REQUEST, true),
    INVALID_INPUT(1004, "error.invalid_input", HttpStatus.BAD_REQUEST, true),
    INVALID_PAGEABLE(1005, "error.invalid_pageable", HttpStatus.BAD_REQUEST, true),
    INVALID_URL(1006, "error.invalid_url", HttpStatus.BAD_REQUEST, true),
    INVALID_KEY(1007, "error.invalid_key", HttpStatus.BAD_REQUEST, true),
    INVALID_REQUEST(1008, "error.invalid_request", HttpStatus.BAD_REQUEST, true),
    INVALID_INPUT_DATA(1009, "error.invalid_input_data", HttpStatus.BAD_REQUEST, true),

    // Nhóm: User & Auth Logic (400) (11xx)
    INVALID_USER_INFO(1100, "error.invalid_user_info", HttpStatus.BAD_REQUEST, true),
    EMAIL_ALREADY_EXISTS(1101, "error.email_already_exists", HttpStatus.BAD_REQUEST, true),
    RESET_TOKEN_INVALID(1102, "error.reset_token_invalid", HttpStatus.BAD_REQUEST, true),
    OTP_INVALID(1103, "error.otp_invalid", HttpStatus.BAD_REQUEST, true),
    OTP_EXPIRED(1104, "error.otp_expired", HttpStatus.BAD_REQUEST, true),
    SOCIAL_USER_INFO_INVALID(1105, "error.social_user_info_invalid", HttpStatus.BAD_REQUEST, true),
    GOOGLE_TOKEN_INVALID(1106, "error.google_token_invalid", HttpStatus.BAD_REQUEST, true),
    FACEBOOK_TOKEN_INVALID(1107, "error.facebook_token_invalid", HttpStatus.BAD_REQUEST, true),
    MAX_SESSIONS_EXCEEDED(1108, "error.max_sessions_exceeded", HttpStatus.BAD_REQUEST, true),
    
    // Đã chuẩn hoá lại code và key cho các enum cũ
    INCORRECT_PASSWORD(1109, "error.incorrect_password", HttpStatus.BAD_REQUEST, true),
    ACCOUNT_ALREADY_DEACTIVATED(1120, "error.account_already_deactivated", HttpStatus.BAD_REQUEST, true),
    ACCOUNT_NOT_DEACTIVATED(1121, "error.account_not_deactivated", HttpStatus.BAD_REQUEST, true),
    ACCOUNT_RECOVERY_EXPIRED(1122, "error.account_recovery_expired", HttpStatus.BAD_REQUEST,true),


    // Nhóm: Payment & Wallet (12xx)
    INVALID_PAYMENT_PROVIDER(1200, "error.invalid_payment_provider", HttpStatus.BAD_REQUEST, true),
    PAYMENT_PROCESSING_FAILED(1201, "error.payment_processing_failed", HttpStatus.BAD_REQUEST, true),
    INVALID_SIGNATURE(1202, "error.invalid_webhook_signature", HttpStatus.BAD_REQUEST, true),
    INVALID_AMOUNT(1203, "error.invalid_amount", HttpStatus.BAD_REQUEST, true),
    INSUFFICIENT_FUNDS(1204, "error.insufficient_funds", HttpStatus.BAD_REQUEST, true),
    TRANSACTION_NOT_REFUNDABLE(1205, "error.transaction_not_refundable", HttpStatus.BAD_REQUEST, true),

    // Nhóm: File & Media (13xx)
    INVALID_FILE_FORMAT(1300, "error.invalid_file_format", HttpStatus.BAD_REQUEST, true),
    FILE_UPLOAD_FAILED(1301, "error.file_upload_failed", HttpStatus.BAD_REQUEST, true),

    // Nhóm: Business Logic (14xx)
    EXCEEDS_MAX_MEMBERS(1400, "error.exceeds_max_members", HttpStatus.BAD_REQUEST, true),
    INVALID_COURSE_TYPE(1401, "error.invalid_course_type", HttpStatus.BAD_REQUEST, true),
    REASON_FOR_CHANGE_REQUIRED(1402, "error.reason_for_change_required", HttpStatus.BAD_REQUEST, true),
    MESSAGE_EDIT_EXPIRED(1403, "error.message_edit_expired", HttpStatus.BAD_REQUEST, true),


    // Nhóm: External Services (15xx)
    EMAIL_SEND_FAILED(1500, "error.email_send_failed", HttpStatus.BAD_REQUEST, true),
    AI_PROCESSING_FAILED(1501, "error.ai_processing_failed", HttpStatus.BAD_REQUEST, true),
    SMS_SEND_FAILED(1502, "error.sms_send_failed", HttpStatus.BAD_REQUEST, true),


    // ===== 401 Unauthorized (Lỗi xác thực, FE tự xử lý, không hiển thị: userFacing=false) =====
    UNAUTHENTICATED(2000, "error.unauthenticated", HttpStatus.UNAUTHORIZED, false),
    TOKEN_EXPIRED(2001, "error.token_expired", HttpStatus.UNAUTHORIZED, false),
    TOKEN_INVALID(2002, "error.token_invalid", HttpStatus.UNAUTHORIZED, false),
    TOKEN_SIGNATURE_INVALID(2003, "error.token_signature_invalid", HttpStatus.UNAUTHORIZED, false),
    TOKEN_REVOKED(2004, "error.token_revoked", HttpStatus.UNAUTHORIZED, false),
    INVALID_TOKEN_FORMAT(2005, "error.invalid_token_format", HttpStatus.UNAUTHORIZED, false),
    REFRESH_TOKEN_EXPIRED(2006, "error.refresh_token_expired", HttpStatus.UNAUTHORIZED, false),
    REFRESH_TOKEN_INVALID(2007, "error.refresh_token_invalid", HttpStatus.UNAUTHORIZED, false),
    REFRESH_TOKEN_DEVICE_MISMATCH(2008, "error.refresh_token_device_mismatch", HttpStatus.UNAUTHORIZED, false),
    REFRESH_TOKEN_NOT_FOUND(2009, "error.refresh_token_not_found", HttpStatus.UNAUTHORIZED, false),
    FIREBASE_TOKEN_VERIFICATION_FAILED(2010, "error.firebase_token_verification_failed", HttpStatus.UNAUTHORIZED, false),
    
    // Đã chuyển sang 400/1110 nhưng giữ lại code 2011 để tránh xoá
    INVALID_PASSWORD(2011, "error.invalid_password_401", HttpStatus.UNAUTHORIZED, false),


    // ===== 403 Forbidden (Lỗi phân quyền, FE tự xử lý, không hiển thị: userFacing=false) =====
    UNAUTHORIZED(3000, "error.unauthorized", HttpStatus.FORBIDDEN, false),
    NOT_ROOM_MEMBER(3001, "error.not_room_member", HttpStatus.FORBIDDEN, false),
    NOT_ROOM_CREATOR(3002, "error.not_room_creator", HttpStatus.FORBIDDEN, false),
    NOT_GROUP_CHAT(3003, "error.not_group_chat", HttpStatus.FORBIDDEN, false),
    ROOM_PURPOSE_MISMATCH(3004, "error.room_purpose_mismatch", HttpStatus.FORBIDDEN, false),
    ROADMAP_NOT_PUBLIC(3005, "error.roadmap_not_public", HttpStatus.FORBIDDEN, false),
    COURSE_NOT_PUBLIC_YET(3006, "error.course_not_public_yet", HttpStatus.FORBIDDEN, false),


    // ===== 404 Not Found (Không tìm thấy, an toàn để hiển thị: userFacing=true) =====
    // Nhóm: Core Entities (40xx)
    USER_NOT_FOUND(4000, "error.user_not_found", HttpStatus.NOT_FOUND, true),
    FILE_NOT_FOUND(4001, "error.file_not_found", HttpStatus.NOT_FOUND, true),
    PERMISSION_NOT_FOUND(4002, "error.permission_not_found", HttpStatus.NOT_FOUND, true),
    ROLE_NOT_FOUND(4003, "error.role_not_found", HttpStatus.NOT_FOUND, true),
    LANGUAGE_NOT_FOUND(4004, "error.language_not_found", HttpStatus.NOT_FOUND, true),
    PARTICIPANT_NOT_FOUND(4005, "error.participant_not_found", HttpStatus.NOT_FOUND, true),
    SUGGESTION_NOT_FOUND(4006, "error.suggestion_not_found", HttpStatus.NOT_FOUND, true),

    // Nhóm: Lesson & Course (41xx)
    LESSON_NOT_FOUND(4100, "error.lesson_not_found", HttpStatus.NOT_FOUND, true),
    LESSON_QUESTION_NOT_FOUND(4101, "error.lesson_question_not_found", HttpStatus.NOT_FOUND, true),
    LESSON_PROGRESS_NOT_FOUND(4102, "error.lesson_progress_not_found", HttpStatus.NOT_FOUND, true),
    LESSON_PROGRESS_WRONG_ITEM_NOT_FOUND(4103, "error.lesson_progress_wrong_item_not_found", HttpStatus.NOT_FOUND, true),
    LESSON_ORDER_IN_SERIES_NOT_FOUND(4104, "error.lesson_order_in_series_not_found", HttpStatus.NOT_FOUND, true),
    LESSON_CATEGORY_NOT_FOUND(4105, "error.lesson_category_not_found", HttpStatus.NOT_FOUND, true),
    LESSON_SUB_CATEGORY_NOT_FOUND(4106, "error.lesson_sub_category_not_found", HttpStatus.NOT_FOUND, true),
    LESSON_SERIES_NOT_FOUND(4107, "error.lesson_series_not_found", HttpStatus.NOT_FOUND, true),
    COURSE_NOT_FOUND(4108, "error.course_not_found", HttpStatus.NOT_FOUND, true),
    COURSE_DISCOUNT_NOT_FOUND(4109, "error.course_discount_not_found", HttpStatus.NOT_FOUND, true),
    COURSE_ENROLLMENT_NOT_FOUND(4110, "error.course_enrollment_not_found", HttpStatus.NOT_FOUND, true),
    COURSE_LESSON_NOT_FOUND(4111, "error.course_lesson_not_found", HttpStatus.NOT_FOUND, true),
    COURSE_REVIEW_NOT_FOUND(4112, "error.course_review_not_found", HttpStatus.NOT_FOUND, true),
    COURSE_VERSION_NOT_FOUND(4113, "error.course_version_not_found", HttpStatus.NOT_FOUND, true),
    VERSION_NOT_FOUND_OR_NOT_DRAFT(4114, "error.version_not_found_or_not_draft", HttpStatus.NOT_FOUND, true),
    CERTIFICATE_NOT_FOUND(4115, "error.certificate_not_found", HttpStatus.NOT_FOUND, true),
    MEMORIZATION_NOT_FOUND(4116, "error.memorization_not_found", HttpStatus.NOT_FOUND, true),
    VIDEO_NOT_FOUND(4117, "error.video_not_found", HttpStatus.NOT_FOUND, true),

    // Nhóm: Grammar (42xx)
    GRAMMAR_TOPIC_NOT_FOUND(4200, "error.grammar_topic_not_found", HttpStatus.NOT_FOUND, true),
    GRAMMAR_RULE_NOT_FOUND(4201, "error.grammar_rule_not_found", HttpStatus.NOT_FOUND, true),
    GRAMMAR_EXERCISES_NOT_FOUND(4202, "error.grammar_exercises_not_found", HttpStatus.NOT_FOUND, true),

    // Nhóm: Social & Chat (43xx)
    ROOM_NOT_FOUND(4300, "error.room_not_found", HttpStatus.NOT_FOUND, true),
    FRIENDSHIP_NOT_FOUND(4301, "error.friendship_not_found", HttpStatus.NOT_FOUND, true),
    CHAT_MESSAGE_NOT_FOUND(4302, "error.chat_message_not_found", HttpStatus.NOT_FOUND, true),
    COUPLE_NOT_FOUND(4303, "error.couple_not_found", HttpStatus.NOT_FOUND, true),

    // Nhóm: Gamification & Other (44xx)
    LEADERBOARD_NOT_FOUND(4400, "error.leaderboard_not_found", HttpStatus.NOT_FOUND, true),
    LEADERBOARD_ENTRY_NOT_FOUND(4401, "error.leaderboard_entry_not_found", HttpStatus.NOT_FOUND, true),
    BADGE_NOT_FOUND(4402, "error.badge_not_found", HttpStatus.NOT_FOUND, true),
    CHARACTER3D_NOT_FOUND(4403, "error.character3d_not_found", HttpStatus.NOT_FOUND, true),
    EVENT_NOT_FOUND(4404, "error.event_not_found", HttpStatus.NOT_FOUND, true),
    NOTIFICATION_NOT_FOUND(4405, "error.notification_not_found", HttpStatus.NOT_FOUND, true),

    // Nhóm: Payment & Wallet (45xx)
    TRANSACTION_NOT_FOUND(4500, "error.transaction_not_found", HttpStatus.NOT_FOUND, true),
    WALLET_NOT_FOUND(4501, "error.wallet_not_found", HttpStatus.NOT_FOUND, true),

    // Nhóm: Video Call (46xx)
    GROUP_SESSION_NOT_FOUND(4600, "error.group_session_not_found", HttpStatus.NOT_FOUND, true),
    GROUP_ANSWER_NOT_FOUND(4601, "error.group_answer_not_found", HttpStatus.NOT_FOUND, true),
    VIDEO_CALL_NOT_FOUND(4602, "error.video_call_not_found", HttpStatus.NOT_FOUND, true),

    // Nhóm: Roadmap (47xx)
    ROADMAP_NOT_FOUND(4700, "error.roadmap_not_found", HttpStatus.NOT_FOUND, true),
    ROADMAP_ITEM_NOT_FOUND(4701, "error.roadmap_item_not_found", HttpStatus.NOT_FOUND, true),
    ROADMAP_NOT_ASSIGNED(4702, "error.roadmap_not_assigned", HttpStatus.NOT_FOUND, true),

    // ===== 405 Method Not Allowed (Lỗi hệ thống, không hiển thị: userFacing=false) =====
    METHOD_NOT_ALLOWED(5000, "error.method_not_allowed", HttpStatus.METHOD_NOT_ALLOWED, false),

    // ===== 409 Conflict (Lỗi xung đột, an toàn để hiển thị: userFacing=true) =====
    COURSE_HAS_DRAFT_ALREADY(6000, "error.course_has_draft_already", HttpStatus.CONFLICT, true),
    ALREADY_EXISTS(6001, "error.already_exists", HttpStatus.CONFLICT, true),
    
    // Đã chuẩn hoá lại code và key cho các enum cũ
    DUPLICATE_SUGGESTION(6002, "error.duplicate_suggestion", HttpStatus.CONFLICT, true),
    CONCURRENT_UPDATE_ERROR(6003, "error.concurrent_update_error", HttpStatus.CONFLICT, true),

    // ===== 415 Unsupported Media Type (Lỗi hệ thống, không hiển thị: userFacing=false) =====
    UNSUPPORTED_MEDIA_TYPE(7000, "error.unsupported_media_type", HttpStatus.UNSUPPORTED_MEDIA_TYPE, false),

    // ===== 500 Internal Server Error (Lỗi hệ thống, không hiển thị: userFacing=false) =====
    UNCATEGORIZED_EXCEPTION(9000, "error.uncategorized_exception", HttpStatus.INTERNAL_SERVER_ERROR, false),
    FILE_PROCESSING_ERROR(9001, "error.file_processing_failed", HttpStatus.INTERNAL_SERVER_ERROR, false),
    TOKEN_GENERATION_FAILED(9002, "error.token_generation_failed", HttpStatus.INTERNAL_SERVER_ERROR, false),
    SESSION_LOG_CREATION_FAILED(9003, "error.session_log_creation_failed", HttpStatus.INTERNAL_SERVER_ERROR, false),
    GRPC_SERVICE_ERROR(9004, "error.grpc_service_error", HttpStatus.INTERNAL_SERVER_ERROR, false),
    SMS_SERVICE_NOT_CONFIGURED(9005, "error.sms_service_not_configured", HttpStatus.INTERNAL_SERVER_ERROR, false),

    // ===== 503 Service Unavailable (Lỗi hệ thống, không hiển thị: userFacing=false) =====
    REDIS_CONNECTION_FAILED(9500, "error.redis_connection_failed", HttpStatus.SERVICE_UNAVAILABLE, false);


    private final int code;
    private final String message;
    private final HttpStatus statusCode;
    private final boolean userFacing;

    ErrorCode(int code, String message, HttpStatus statusCode, boolean userFacing) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
        this.userFacing = userFacing;
    }
}