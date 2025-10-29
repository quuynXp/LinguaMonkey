package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.configuration.TwilioConfig;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.service.SmsService;
import com.twilio.exception.ApiException;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class SmsServiceImpl implements SmsService {

    private final TwilioConfig twilioConfig;

    @Override
    public void sendSms(String toPhoneNumber, String messageBody) {
        // Kiểm tra xem config đã được load và init thành công chưa
        if (twilioConfig.getFromPhoneNumber() == null) {
            log.error("Twilio 'fromPhoneNumber' is null. SMS not sent. Vui lòng kiểm tra 'twilio.from-phone-number' trong file properties.");
            // Dùng lại ErrorCode cũ của bạn
            throw new AppException(ErrorCode.SMS_SERVICE_NOT_CONFIGURED);
        }

        try {
            // Chuyển đổi chuỗi SĐT sang object PhoneNumber của Twilio
            PhoneNumber to = new PhoneNumber(toPhoneNumber);
            PhoneNumber from = new PhoneNumber(twilioConfig.getFromPhoneNumber());

            // Gửi tin nhắn
            Message message = Message.creator(to, from, messageBody).create();

            log.info("Sent SMS to {}. Message SID: {}", toPhoneNumber, message.getSid());

        } catch (ApiException e) {
            // Lỗi từ phía Twilio (ví dụ: SĐT không hợp lệ, không đủ tiền...)
            log.error("Failed to send SMS to {}: {} (Code: {})", toPhoneNumber, e.getMessage(), e.getCode());
            // Bạn nên thêm ErrorCode.SMS_SEND_FAILED vào enum ErrorCode
            throw new AppException(ErrorCode.SMS_SEND_FAILED);
        } catch (Exception e) {
            // Bắt các lỗi khác, ví dụ: SĐT không hợp lệ (lỗi parse)
            log.error("Failed to send SMS to {}: {}", toPhoneNumber, e.getMessage());
            throw new AppException(ErrorCode.SMS_SEND_FAILED);
        }
    }
}
