// errorCodes.ts

export interface ErrorCode {
  code: number;
  messageKey: string;    // key i18n BE trả về (FE có thể dùng hoặc dùng message trực tiếp từ BE)
  httpStatus: number;
  isUserFriendly: boolean; // Nếu false => lỗi hệ thống, FE đổi sang message chung
}

// Các error code giống enum backend
const errorCodesList: ErrorCode[] = [
  // 400 Bad Request
  { code: 1000, messageKey: "error.missing_required_field", httpStatus: 400, isUserFriendly: true },
  { code: 1001, messageKey: "error.invalid_user_info", httpStatus: 400, isUserFriendly: true },
  { code: 1002, messageKey: "error.invalid_key", httpStatus: 400, isUserFriendly: true },
  { code: 1003, messageKey: "error.invalid_token_format", httpStatus: 400, isUserFriendly: true },
  { code: 1004, messageKey: "error.max_sessions_exceeded", httpStatus: 400, isUserFriendly: true },
  { code: 1005, messageKey: "error.request_body_invalid", httpStatus: 400, isUserFriendly: true },
  { code: 1006, messageKey: "error.request_param_missing", httpStatus: 400, isUserFriendly: true },
  { code: 1007, messageKey: "error.validation_failed", httpStatus: 400, isUserFriendly: true },
  { code: 1008, messageKey: "error.email_sending_failed", httpStatus: 400, isUserFriendly: true },
  { code: 1009, messageKey: "error.invalid_webhook_signature", httpStatus: 400, isUserFriendly: true },
  { code: 1010, messageKey: "error.invalid_payment_provider", httpStatus: 400, isUserFriendly: true },
  { code: 1011, messageKey: "error.payment_processing_failed", httpStatus: 400, isUserFriendly: true },
  { code: 1012, messageKey: "error.exceeds_max_members", httpStatus: 400, isUserFriendly: true },
  { code: 1013, messageKey: "error.invalid_input", httpStatus: 400, isUserFriendly: true },
  { code: 1014, messageKey: "error.invalid_pageable", httpStatus: 400, isUserFriendly: true },
  { code: 1015, messageKey: "error.invalid_file_format", httpStatus: 400, isUserFriendly: true },
  { code: 1016, messageKey: "error.file_upload_failed", httpStatus: 400, isUserFriendly: true },
  { code: 1017, messageKey: "error.invalid_url", httpStatus: 400, isUserFriendly: true },
  { code: 1018, messageKey: "error.ai_processing_failed", httpStatus: 400, isUserFriendly: true },

  // 401 Unauthorized
  { code: 2000, messageKey: "error.unauthenticated", httpStatus: 401, isUserFriendly: true },
  { code: 2001, messageKey: "error.token_expired", httpStatus: 401, isUserFriendly: true },
  { code: 2002, messageKey: "error.token_invalid", httpStatus: 401, isUserFriendly: true },
  { code: 2003, messageKey: "error.token_signature_invalid", httpStatus: 401, isUserFriendly: true },
  { code: 2004, messageKey: "error.token_revoked", httpStatus: 401, isUserFriendly: true },
  { code: 2005, messageKey: "error.refresh_token_expired", httpStatus: 401, isUserFriendly: true },
  { code: 2006, messageKey: "error.refresh_token_invalid", httpStatus: 401, isUserFriendly: true },
  { code: 2007, messageKey: "error.refresh_token_device_mismatch", httpStatus: 401, isUserFriendly: true },
  { code: 2008, messageKey: "error.firebase_token_verification_failed", httpStatus: 401, isUserFriendly: true },
  { code: 2009, messageKey: "error.refresh_token_not_found", httpStatus: 401, isUserFriendly: true },
  { code: 2010, messageKey: "error.invalid_password", httpStatus: 401, isUserFriendly: true },

  // 403 Forbidden
  { code: 3000, messageKey: "error.unauthorized", httpStatus: 403, isUserFriendly: true },
  { code: 3001, messageKey: "error.not_room_member", httpStatus: 403, isUserFriendly: true },
  { code: 3002, messageKey: "error.not_room_creator", httpStatus: 403, isUserFriendly: true },
  { code: 3003, messageKey: "error.not_group_chat", httpStatus: 403, isUserFriendly: true },
  { code: 3004, messageKey: "error.room_purpose_mismatch", httpStatus: 403, isUserFriendly: true },

  // 404 Not Found
  { code: 4000, messageKey: "error.user_not_found", httpStatus: 404, isUserFriendly: true },
  { code: 4001, messageKey: "error.file_not_found", httpStatus: 404, isUserFriendly: true },
  { code: 4002, messageKey: "error.lesson_not_found", httpStatus: 404, isUserFriendly: true },
  { code: 4003, messageKey: "error.certificate_not_found", httpStatus: 404, isUserFriendly: true },
  { code: 4004, messageKey: "error.lesson_question_not_found", httpStatus: 404, isUserFriendly: true },
  { code: 4005, messageKey: "error.lesson_progress_wrong_item_not_found", httpStatus: 404, isUserFriendly: true },
  { code: 4006, messageKey: "error.lesson_progress_not_found", httpStatus: 404, isUserFriendly: true },
  { code: 4007, messageKey: "error.lesson_order_in_series_not_found", httpStatus: 404, isUserFriendly: true },
  { code: 4008, messageKey: "error.lesson_category_not_found", httpStatus: 404, isUserFriendly: true },
  { code: 4009, messageKey: "error.lesson_sub_category_not_found", httpStatus: 404, isUserFriendly: true },
  { code: 4010, messageKey: "error.lesson_series_not_found", httpStatus: 404, isUserFriendly: true },
  { code: 4011, messageKey: "error.language_not_found", httpStatus: 404, isUserFriendly: true },
  { code: 4012, messageKey: "error.group_session_not_found", httpStatus: 404, isUserFriendly: true },
  { code: 4013, messageKey: "error.group_answer_not_found", httpStatus: 404, isUserFriendly: true },
  { code: 4014, messageKey: "error.permission_not_found", httpStatus: 404, isUserFriendly: true },
  { code: 4015, messageKey: "error.role_not_found", httpStatus: 404, isUserFriendly: true },
  { code: 4016, messageKey: "error.room_not_found", httpStatus: 404, isUserFriendly: true },
  { code: 4017, messageKey: "error.transaction_not_found", httpStatus: 404, isUserFriendly: true },
  { code: 4018, messageKey: "error.friendship_not_found", httpStatus: 404, isUserFriendly: true },
  { code: 4019, messageKey: "error.event_not_found", httpStatus: 404, isUserFriendly: true },
  { code: 4020, messageKey: "error.video_call_not_found", httpStatus: 404, isUserFriendly: true },
  { code: 4021, messageKey: "error.notification_not_found", httpStatus: 404, isUserFriendly: true },
  { code: 4022, messageKey: "error.leaderboard_not_found", httpStatus: 404, isUserFriendly: true },
  { code: 4023, messageKey: "error.leaderboard_entry_not_found", httpStatus: 404, isUserFriendly: true },
  { code: 4024, messageKey: "error.badge_not_found", httpStatus: 404, isUserFriendly: true },
  { code: 4025, messageKey: "error.character3d_not_found", httpStatus: 404, isUserFriendly: true },
  { code: 4026, messageKey: "error.chat_message_not_found", httpStatus: 404, isUserFriendly: true },
  { code: 4027, messageKey: "error.couple_not_found", httpStatus: 404, isUserFriendly: true },
  { code: 4028, messageKey: "error.course_not_found", httpStatus: 404, isUserFriendly: true },
  { code: 4029, messageKey: "error.course_discount_not_found", httpStatus: 404, isUserFriendly: true },
  { code: 4030, messageKey: "error.course_enrollment_not_found", httpStatus: 404, isUserFriendly: true },
  { code: 4031, messageKey: "error.course_lesson_not_found", httpStatus: 404, isUserFriendly: true },
  { code: 4032, messageKey: "error.course_review_not_found", httpStatus: 404, isUserFriendly: true },
  { code: 4033, messageKey: "error.memorization_not_found", httpStatus: 404, isUserFriendly: true },
  { code: 4034, messageKey: "error.video_not_found", httpStatus: 404, isUserFriendly: true },

  // 405 Method Not Allowed
  { code: 7000, messageKey: "error.method_not_allowed", httpStatus: 405, isUserFriendly: true },

  // 415 Unsupported Media Type
  { code: 7001, messageKey: "error.unsupported_media_type", httpStatus: 415, isUserFriendly: true },

  // 500 Internal Server Error (các lỗi hệ thống, FE đổi message)
  { code: 5000, messageKey: "error.file_processing_failed", httpStatus: 500, isUserFriendly: false },
  { code: 5001, messageKey: "error.token_generation_failed", httpStatus: 500, isUserFriendly: false },
  { code: 5002, messageKey: "error.session_log_creation_failed", httpStatus: 500, isUserFriendly: false },
  { code: 5003, messageKey: "error.uncategorized_exception", httpStatus: 500, isUserFriendly: false },

  // 503 Service Unavailable
  { code: 6000, messageKey: "error.redis_connection_failed", httpStatus: 503, isUserFriendly: false },
];

// Map nhanh theo code
const errorCodeMap: Record<number, ErrorCode> = {};
errorCodesList.forEach((e) => {
  errorCodeMap[e.code] = e;
});

// Message chung cho lỗi hệ thống
const DEFAULT_SYSTEM_ERROR_MSG = "Có lỗi xảy ra, vui lòng thử lại sau.";

// Hàm xử lý lấy message hiển thị cho FE
export function getErrorMessageFromCode(
  code: number,
  backendMessage?: string
): string {
  const error = errorCodeMap[code];

  // Nếu ko biết code => trả message backend hoặc mặc định
  if (!error) {
    return backendMessage || DEFAULT_SYSTEM_ERROR_MSG;
  }

  // Nếu lỗi thân thiện thì lấy message backend (đã locale rồi)
  if (error.isUserFriendly) {
    return backendMessage || error.messageKey;
  }

  // Lỗi hệ thống thì dùng message chung
  return DEFAULT_SYSTEM_ERROR_MSG;
}
