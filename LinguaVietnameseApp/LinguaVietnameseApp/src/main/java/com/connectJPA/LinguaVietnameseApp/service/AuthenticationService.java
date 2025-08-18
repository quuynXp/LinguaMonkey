package com.connectJPA.LinguaVietnameseApp.service;

import com.connectJPA.LinguaVietnameseApp.dto.request.AuthenticationRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.AuthenticationResponse;
import com.connectJPA.LinguaVietnameseApp.dto.response.IntrospectResponse;
import com.nimbusds.jose.JOSEException;

import java.text.ParseException;
import java.util.List;
import java.util.UUID;

public interface AuthenticationService {
    AuthenticationResponse authenticate(AuthenticationRequest request, String deviceId, String ip, String userAgent);

    AuthenticationResponse handleRefreshToken(String refreshToken, String deviceId, String ip, String userAgent);

    AuthenticationResponse loginWithFirebase(String firebaseIdToken);

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
}
