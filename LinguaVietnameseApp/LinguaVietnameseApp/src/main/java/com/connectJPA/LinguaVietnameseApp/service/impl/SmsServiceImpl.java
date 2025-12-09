package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.configuration.TwilioConfig;
import com.connectJPA.LinguaVietnameseApp.dto.response.AuthenticationResponse;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.enums.AuthProvider;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.service.SmsService;
import com.twilio.rest.verify.v2.service.Verification;
import com.twilio.rest.verify.v2.service.VerificationCheck;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.time.Instant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class SmsServiceImpl implements SmsService {

    private final TwilioConfig twilioConfig;

    @Override
    public void sendSms(String toPhoneNumber, String otpCode) {
        if (twilioConfig.getAccountSid() == null || twilioConfig.getVerifyServiceSid() == null) {
            log.warn("Twilio Verify Service is not fully configured. Cannot send SMS to: {}", toPhoneNumber);
            log.info("OTP (SMS Service Disabled): {} for phone: {}", otpCode, toPhoneNumber);
            throw new AppException(ErrorCode.SMS_SEND_FAILED); 
        }

        try {
            Verification verification = Verification.creator(
                            twilioConfig.getVerifyServiceSid(),
                            toPhoneNumber,
                            "sms")
                    .create();

            log.info("Verification requested for {} using SID: {}", toPhoneNumber, verification.getSid());

        } catch (com.twilio.exception.ApiException e) {
            log.error("Failed to send verification SMS to {}: {} (Code: {})", 
                toPhoneNumber, e.getMessage(), e.getCode());
            throw new AppException(ErrorCode.SMS_SEND_FAILED);
        } catch (Exception e) {
            log.error("An unexpected error occurred while sending SMS to {}", toPhoneNumber, e);
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public boolean verifyOtp(String toPhoneNumber, String otpCode) {
    if (twilioConfig.getVerifyServiceSid() == null) {
        log.error("Twilio Verify Service SID not configured for verification.");
        throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
    }

    try {
        VerificationCheck verificationCheck = VerificationCheck.creator(
                        twilioConfig.getVerifyServiceSid())
                .setTo(toPhoneNumber)
                .setCode(otpCode)
                .create();

        if (verificationCheck.getValid()) {
            log.info("OTP successfully verified for {}. SID: {}", 
                toPhoneNumber, verificationCheck.getSid());
            return true;
        } else {
            log.warn("OTP verification failed for {}. Status: {}", 
                toPhoneNumber, verificationCheck.getStatus());
            return false;
        }
    } catch (com.twilio.exception.ApiException e) {
        log.error("Twilio API error during OTP verification for {}: {} (Code: {})", 
            toPhoneNumber, e.getMessage(), e.getCode());
        return false; 
    } catch (Exception e) {
        log.error("An unexpected error occurred during OTP verification for {}", toPhoneNumber, e);
        throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
    }
}

}