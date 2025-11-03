package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.AuthenticationRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AuthenticationResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.IntrospectResponse;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.nimbusds.jose.JOSEException;
import org.springframework.transaction.annotation.Transactional;

import java.text.ParseException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface AuthenticationService {
    AuthenticationResponse authenticate(AuthenticationRequest request, String deviceId, String ip, String userAgent);


    AuthenticationResponse loginWithGoogle(String idToken, String deviceId, String ip, String userAgent);

    AuthenticationResponse loginWithFacebook(String accessToken, String deviceId, String ip, String userAgent);

    boolean requestOtp(String emailOrPhone);

    AuthenticationResponse verifyOtpAndLogin(String emailOrPhone, String code, String deviceId, String ip, String userAgent);

    AuthenticationResponse handleRefreshToken(String refreshToken, String deviceId, String ip, String userAgent);

    void logout(String token);

    void logoutAll(UUID userId);

    IntrospectResponse introspect(String token) throws ParseException, JOSEException;

    boolean isTokenValid(String token);

    UUID extractTokenByUserId(String token);

    List<String> extractScope(String token);

    void sendVerifyEmail(String email, UUID userId);
    void sendPasswordResetCode(String email);
    String verifyResetCode(String email, String code);
    void resetPassword(String resetToken, String newPassword);
    String generateRefreshToken(User user, int days);
    String generateToken(User user);

    @Transactional
    void requestPasswordResetOtp(String identifier, String method);

    // ENDPOINT MỚI 3: Verify Password Reset OTP
    @Transactional
    String verifyPasswordResetOtp(String identifier, String code);

    @Transactional
    Map<String, Object> checkResetMethods(String identifier);
}
