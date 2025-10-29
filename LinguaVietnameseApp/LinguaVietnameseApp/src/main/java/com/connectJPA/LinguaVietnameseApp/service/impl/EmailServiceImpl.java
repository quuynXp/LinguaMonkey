package com.connectJPA.LinguaVietnameseApp.service.impl;

import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.exception.SystemException;
import com.connectJPA.LinguaVietnameseApp.service.EmailService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.MessageSource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailServiceImpl implements EmailService {
    private final JavaMailSender mailSender;
    private final MessageSource messageSource;

    @Value("${spring.mail.username}")
    private String fromEmail;

    private void sendEmail(String to, String subject, String content) throws MessagingException {
        MimeMessage mimeMessage = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true);
        helper.setFrom(fromEmail);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(content, true); // true để gửi HTML nếu cần
        mailSender.send(mimeMessage);
    }

    @Override
    public void sendPurchaseCourseEmail(String email, String courseName, Locale locale) throws MessagingException {
        try {
            if (email == null || courseName == null || email.isBlank() || courseName.isBlank()) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            String subject = messageSource.getMessage("email.course.subject", new Object[]{courseName}, locale != null ? locale : Locale.getDefault());
            String content = messageSource.getMessage("email.course.body", new Object[]{courseName}, locale != null ? locale : Locale.getDefault());
            sendEmail(email, subject, content);
            log.info("Sent course purchase email to {}", email);
        } catch (MessagingException e) {
            throw new SystemException(ErrorCode.EMAIL_SENDING_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public void sendVoucherRegistrationEmail(String email, String voucherCode, Locale locale) throws MessagingException {
        try {
            if (email == null || voucherCode == null || email.isBlank() || voucherCode.isBlank()) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            String subject = messageSource.getMessage("email.voucher.subject", new Object[]{voucherCode}, locale != null ? locale : Locale.getDefault());
            String content = messageSource.getMessage("email.voucher.body", new Object[]{voucherCode}, locale != null ? locale : Locale.getDefault());
            sendEmail(email, subject, content);
            log.info("Sent voucher email to {}", email);
        } catch (MessagingException e) {
            throw new SystemException(ErrorCode.EMAIL_SENDING_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public void sendAchievementEmail(String email, String title, String message, Locale locale) throws MessagingException {
        try {
            if (email == null || title == null || message == null || email.isBlank() || title.isBlank() || message.isBlank()) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            String subject = messageSource.getMessage("email.achievement.subject", new Object[]{title}, locale != null ? locale : Locale.getDefault());
            String content = messageSource.getMessage("email.achievement.body", new Object[]{title, message}, locale != null ? locale : Locale.getDefault());
            sendEmail(email, subject, content);
            log.info("Sent achievement email to {}", email);
        } catch (MessagingException e) {
            throw new SystemException(ErrorCode.EMAIL_SENDING_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public void sendDailyStudyReminder(String email, Locale locale) throws MessagingException {
        try {
            if (email == null || email.isBlank()) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            String subject = messageSource.getMessage("email.daily_reminder.subject", null, locale != null ? locale : Locale.getDefault());
            String content = messageSource.getMessage("email.daily_reminder.body", null, locale != null ? locale : Locale.getDefault());
            sendEmail(email, subject, content);
            log.info("Sent daily study reminder email to {}", email);
        } catch (MessagingException e) {
            throw new SystemException(ErrorCode.EMAIL_SENDING_FAILED);
        } catch (Exception e) {
            log.error("Error sending daily study reminder to {}: {}", email, e.getMessage());
        }
    }

    @Override
    public void sendPasswordResetEmail(String email, String resetLink, Locale locale) throws MessagingException {
        try {
            if (email == null || resetLink == null || email.isBlank() || resetLink.isBlank()) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            String subject = messageSource.getMessage("email.reset.subject", null, locale != null ? locale : Locale.getDefault());
            String content = messageSource.getMessage("email.reset.body", new Object[]{resetLink}, locale != null ? locale : Locale.getDefault());
            sendEmail(email, subject, content);
            log.info("Sent password reset email to {}", email);
        } catch (MessagingException e) {
            throw new SystemException(ErrorCode.EMAIL_SENDING_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public void sendVerifyAccountEmail(String email, String verifyLink, Locale locale) throws MessagingException {
        try {
            if (email == null || verifyLink == null || email.isBlank() || verifyLink.isBlank()) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            String subject = messageSource.getMessage("email.verify.subject", null, locale != null ? locale : Locale.getDefault());
            String content = messageSource.getMessage("email.verify.body", new Object[]{verifyLink}, locale != null ? locale : Locale.getDefault());
            sendEmail(email, subject, content);
            log.info("Sent verify account email to {}", email);
        } catch (MessagingException e) {
            throw new SystemException(ErrorCode.EMAIL_SENDING_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public void sendInactivityWarning(String email, int days, Locale locale) throws MessagingException {
        try {
            if (email == null || email.isBlank() || days <= 0) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            String subject = messageSource.getMessage("email.inactivity.subject", new Object[]{days}, locale != null ? locale : Locale.getDefault());
            String content = messageSource.getMessage("email.inactivity.body", new Object[]{days}, locale != null ? locale : Locale.getDefault());
            sendEmail(email, subject, content);
            log.info("Sent inactivity warning email to {}", email);
        } catch (MessagingException e) {
            throw new SystemException(ErrorCode.EMAIL_SENDING_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public void sendStreakRewardEmail(String email, int streakDays, Locale locale) throws MessagingException {
        try {
            if (email == null || email.isBlank() || streakDays <= 0) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            String subject = messageSource.getMessage("email.streak.subject", new Object[]{streakDays}, locale != null ? locale : Locale.getDefault());
            String content = messageSource.getMessage("email.streak.body", new Object[]{streakDays}, locale != null ? locale : Locale.getDefault());
            sendEmail(email, subject, content);
            log.info("Sent streak reward email to {}", email);
        } catch (MessagingException e) {
            throw new SystemException(ErrorCode.EMAIL_SENDING_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    @Override
    public void sendOtpEmail(String email, String code, Locale locale) {
        try {
            if (email == null || code == null || email.isBlank()) {
                throw new AppException(ErrorCode.MISSING_REQUIRED_FIELD);
            }
            String subject = messageSource.getMessage("email.otp.subject", new Object[]{code}, locale != null ? locale : Locale.getDefault());
            String content = messageSource.getMessage("email.otp.body", new Object[]{code}, locale != null ? locale : Locale.getDefault());
            sendEmail(email, subject, content);
            log.info("Sent OTP email to {}", email);
        } catch (MessagingException e) {
            throw new SystemException(ErrorCode.EMAIL_SENDING_FAILED);
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }
}