package com.connectJPA.LinguaVietnameseApp.service;

import jakarta.mail.MessagingException;

import java.util.Locale;
import java.util.UUID;

public interface EmailService {
    void sendPurchaseCourseEmail(String email, String courseName, Locale locale) throws MessagingException;
    void sendVoucherRegistrationEmail(String email, String voucherCode, Locale locale) throws MessagingException;
    void sendAchievementEmail(String email, String title, String message, Locale locale) throws MessagingException;
    void sendDailyStudyReminder(String email, Locale locale) throws MessagingException;
    void sendPasswordResetEmail(String email, String resetLink, Locale locale) throws MessagingException;
    void sendVerifyAccountEmail(String email, String verifyLink, Locale locale) throws MessagingException;
    void sendInactivityWarning(String email, int days, Locale locale) throws MessagingException;
    void sendStreakRewardEmail(String email, int streakDays, Locale locale) throws MessagingException;
    void sendOtpEmail(String email, String code, Locale locale);
}