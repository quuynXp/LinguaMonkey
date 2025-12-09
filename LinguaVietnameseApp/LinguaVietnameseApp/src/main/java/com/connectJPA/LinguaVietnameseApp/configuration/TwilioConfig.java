package com.connectJPA.LinguaVietnameseApp.configuration;

import com.twilio.Twilio;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "twilio")
@Getter
@Setter
@Slf4j
public class TwilioConfig {

    @Value("${twilio.account-sid}")
    private String accountSid;

    @Value("${twilio.auth-token}")
    private String authToken;

    @Value("${twilio.from-phone-number}")
    private String fromPhoneNumber;
    
    @Value("${twilio.verify-service-sid}")
    private String verifyServiceSid;

    @PostConstruct
    public void initTwilio() {
        if (accountSid == null || authToken == null || verifyServiceSid == null) {
            log.warn("TWILIO credentials (accountSid, authToken, verifyServiceSid) chưa được cấu hình. SMS Service sẽ KHÔNG hoạt động.");
            return;
        }

        try {
            Twilio.init(accountSid, authToken);
            log.info("Twilio initialized successfully with Account SID: {}", accountSid.substring(0, 5) + "...");
        } catch (Exception e) {
            log.error("Failed to initialize Twilio", e);
        }
    }
}