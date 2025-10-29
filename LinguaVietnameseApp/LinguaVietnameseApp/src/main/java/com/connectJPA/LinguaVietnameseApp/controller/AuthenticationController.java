package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.*;
import com.connectJPA.LinguaVietnameseApp.dto.response.*;
import com.connectJPA.LinguaVietnameseApp.entity.User;
import com.connectJPA.LinguaVietnameseApp.exception.AppException;
import com.connectJPA.LinguaVietnameseApp.exception.ErrorCode;
import com.connectJPA.LinguaVietnameseApp.service.AuthenticationService;
import com.connectJPA.LinguaVietnameseApp.service.UserService;
import com.nimbusds.jose.JOSEException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;


import jakarta.servlet.http.HttpServletResponse;
import java.text.ParseException;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Authentication", description = "Manage user authentication")
public class AuthenticationController {
    AuthenticationService authenticationService;
    UserService userService;

    @PostMapping("/google-login")
    @Operation(summary = "Login with Google", description = "Authenticate user via Google ID token from request body")
    @ApiResponse(responseCode = "200", description = "Google login successful")
    @ApiResponse(responseCode = "401", description = "Invalid Google token")
    public ResponseEntity<AppApiResponse<AuthenticationResponse>> googleLogin(
            @Valid @RequestBody SocialLoginRequest request,
            @RequestHeader(value = "Device-Id", required = false, defaultValue = "") String deviceId,
            @RequestHeader(value = "X-Forwarded-For", required = false, defaultValue = "") String ip,
            @RequestHeader(value = "User-Agent", required = false, defaultValue = "") String userAgent,
            HttpServletResponse response) {

        // Bạn cần thêm logic này vào AuthenticationService
        AuthenticationResponse authResponse = authenticationService.loginWithGoogle(
                request.idToken(), deviceId, ip, userAgent
        );

        // Chuẩn hóa hàm trả về response
        return createAuthResponseEntity(authResponse, response, "Google login successful");
    }

    @PostMapping("/facebook-login")
    @Operation(summary = "Login with Facebook", description = "Authenticate user via Facebook Access Token from request body")
    @ApiResponse(responseCode = "200", description = "Facebook login successful")
    @ApiResponse(responseCode = "401", description = "Invalid Facebook token")
    public ResponseEntity<AppApiResponse<AuthenticationResponse>> facebookLogin(
            @Valid @RequestBody SocialLoginRequest request,
            @RequestHeader(value = "Device-Id", required = false, defaultValue = "") String deviceId,
            @RequestHeader(value = "X-Forwarded-For", required = false, defaultValue = "") String ip,
            @RequestHeader(value = "User-Agent", required = false, defaultValue = "") String userAgent,
            HttpServletResponse response) {

        // Bạn cần thêm logic này vào AuthenticationService
        AuthenticationResponse authResponse = authenticationService.loginWithFacebook(
                request.accessToken(), deviceId, ip, userAgent
        );

        // Chuẩn hóa hàm trả về response
        return createAuthResponseEntity(authResponse, response, "Facebook login successful");
    }


    // --- Controller method for logoutAll ---
    @PostMapping("/logout-all")
    public AppApiResponse<Void> logoutAll(@RequestHeader("userId") UUID userId) {
        authenticationService.logoutAll(userId);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message("Logged out from all devices successfully")
                .build();
    }


    @PostMapping("/login")
    @Operation(summary = "Login", description = "Authenticate user and return token")
    @ApiResponse(responseCode = "200", description = "Login successful")
    @ApiResponse(responseCode = "401", description = "Invalid authentication information")
    public ResponseEntity<AppApiResponse<AuthenticationResponse>> authenticate(
            @Valid @RequestBody AuthenticationRequest request,
            @RequestHeader(value = "Device-Id", required = false, defaultValue = "") String deviceId,
            @RequestHeader(value = "X-Forwarded-For", required = false, defaultValue = "") String ip,
            @RequestHeader(value = "User-Agent", required = false, defaultValue = "") String userAgent,
            HttpServletResponse response) {

        AuthenticationResponse result = authenticationService.authenticate(request, deviceId, ip, userAgent);

        String refreshToken = result.getRefreshToken();

        Cookie cookie = new Cookie("refreshToken", refreshToken);
        cookie.setHttpOnly(true);
        cookie.setSecure(true); // if using HTTPS
        cookie.setPath("/");
        cookie.setMaxAge(30 * 24 * 60 * 60); // 30 days
        response.addCookie(cookie);

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + result.getToken());

        return ResponseEntity.ok()
                .headers(headers)
                .body(AppApiResponse.<AuthenticationResponse>builder()
                        .code(200)
                        .message("Login successful")
                        .result(result)
                        .build());
    }


    @PostMapping
    @Operation(summary = "Register user", description = "Create a new user")
    @ApiResponse(responseCode = "200", description = "User created successfully")
    @ApiResponse(responseCode = "400", description = "Invalid input data")
    public AppApiResponse<UserResponse> registerUser(@Valid @RequestBody UserRequest request) {
        UserResponse userResponse = userService.createUser(request);

        return AppApiResponse.<UserResponse>builder()
                .code(200)
                .message("User created successfully")
                .result(userResponse)
                .build();
    }


    @PostMapping("/refresh-token")
    @Operation(summary = "Refresh token", description = "Refresh access token using refresh token, check device for proper flow")
    @ApiResponse(responseCode = "200", description = "Token refreshed successfully")
    @ApiResponse(responseCode = "400", description = "Invalid refresh token")
    public ResponseEntity<AppApiResponse<AuthenticationResponse>> refreshTokenHandler(
            @CookieValue(name = "refreshToken", required = false) String refreshTokenCookie,
            @RequestBody(required = false) Map<String, String> body,
            @RequestHeader(value = "Device-Id", required = false) String deviceId,
            @RequestHeader(value = "X-Forwarded-For", required = false) String ip,
            @RequestHeader(value = "User-Agent", required = false) String userAgent,
            HttpServletResponse response) {

        System.out.println("Raw body: " + (body != null ? body.toString() : "null"));
        System.out.println("Refresh token from cookie: " + refreshTokenCookie);
        System.out.println("Refresh token from body: " + (body != null ? body.get("refreshToken") : "null"));

        String refreshToken = (body != null && body.get("refreshToken") != null)
                ? body.get("refreshToken")
                : refreshTokenCookie;

        if (refreshToken == null || refreshToken.isBlank()) {
            throw new AppException(ErrorCode.REFRESH_TOKEN_INVALID);
        }

        String deviceIdStrim = deviceId == null ? "" : deviceId;
        String ipStrim = ip == null ? "" : ip;
        String userAgentStrim = userAgent == null ? "" : userAgent;
        AuthenticationResponse result = authenticationService.handleRefreshToken(refreshToken, deviceIdStrim, ipStrim, userAgentStrim);

        String newRefreshToken = result.getRefreshToken();

        Cookie cookie = new Cookie("refreshToken", newRefreshToken);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/");
        cookie.setMaxAge(30 * 24 * 60 * 60);
        response.addCookie(cookie);

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + result.getToken());

        return ResponseEntity.ok()
                .headers(headers)
                .body(AppApiResponse.<AuthenticationResponse>builder()
                        .code(200)
                        .message("Token refreshed successfully")
                        .result(result)
                        .build());
    }


    @PostMapping("/logout")
    @Operation(summary = "Logout", description = "Invalidate current token")
    @ApiResponse(responseCode = "200", description = "Logout successful")
    @ApiResponse(responseCode = "400", description = "Invalid token")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or T(java.util.UUID).fromString(authentication.name).equals(#id)")
    public AppApiResponse<Void> logout(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        authenticationService.logout(token);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message("Logout successful")
                .build();
    }

    @PostMapping("/introspect")
    @Operation(summary = "Introspect token", description = "Check validity of the token")
    @ApiResponse(responseCode = "200", description = "Token introspected successfully")
    @ApiResponse(responseCode = "400", description = "Invalid token")
    public AppApiResponse<IntrospectResponse> introspect(@RequestHeader("Authorization") String authorizationHeader) throws ParseException, JOSEException {
        String token = authorizationHeader.replace("Bearer ", "");
        var result = authenticationService.introspect(token);
        return AppApiResponse.<IntrospectResponse>builder()
                .code(200)
                .message("Token introspected successfully")
                .result(result)
                .build();
    }

    @PostMapping("/register")
    @Operation(summary = "Register account with email", description = "Create a new account with email and password")
    @ApiResponse(responseCode = "200", description = "Registration successful, please verify your email")
    @ApiResponse(responseCode = "400", description = "Invalid input data or email already exists")
    public AppApiResponse<UserResponse> registerWithEmail(@Valid @RequestBody UserRequest request) {
        UserResponse createdUser = userService.createUser(request);
        authenticationService.sendVerifyEmail(createdUser.getEmail(), createdUser.getUserId());
        return AppApiResponse.<UserResponse>builder()
                .code(200)
                .message("Registration successful, please check your email to verify account")
                .result(createdUser)
                .build();
    }


    @PostMapping("/forgot-password")
    @Operation(summary = "Forgot password", description = "Send reset password email")
    @ApiResponse(responseCode = "200", description = "Password reset email sent")
    @ApiResponse(responseCode = "400", description = "Email does not exist")
    public AppApiResponse<Void> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        authenticationService.sendPasswordResetCode(email);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message("Password reset code has been sent to your email")
                .build();
    }

    @PostMapping("/verify-code")
    @Operation(summary = "Verify reset code", description = "Verify code sent via email to get reset token")
    @ApiResponse(responseCode = "200", description = "Valid code")
    @ApiResponse(responseCode = "400", description = "Invalid or expired code")
    public AppApiResponse<Map<String, String>> verifyResetCode(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String code = body.get("code");
        String resetToken = authenticationService.verifyResetCode(email, code);
        return AppApiResponse.<Map<String, String>>builder()
                .code(200)
                .message("Valid code")
                .result(Map.of("resetToken", resetToken))
                .build();
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Reset password", description = "Change new password using reset token")
    @ApiResponse(responseCode = "200", description = "Password reset successful")
    @ApiResponse(responseCode = "400", description = "Invalid token or invalid password")
    public AppApiResponse<Void> resetPassword(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        String newPassword = body.get("password");
        authenticationService.resetPassword(token, newPassword);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message("Password reset successful")
                .build();
    }

    @PostMapping("/request-otp")
    @Operation(summary = "Request OTP", description = "Send OTP to user's email or phone")
    @ApiResponse(responseCode = "200", description = "OTP sent successfully")
    @ApiResponse(responseCode = "400", description = "Invalid email or phone number")
    public AppApiResponse<Map<String, Boolean>> requestOtp(@Valid @RequestBody OtpRequest request) {
        boolean success = authenticationService.requestOtp(request.emailOrPhone());

        return AppApiResponse.<Map<String, Boolean>>builder()
                .code(200)
                .message("OTP sent successfully")
                .result(Map.of("success", success))
                .build();
    }

    @PostMapping("/verify-otp")
    @Operation(summary = "Verify OTP and Login", description = "Verify OTP and return auth tokens if valid")
    @ApiResponse(responseCode = "200", description = "OTP verification successful, user logged in")
    @ApiResponse(responseCode = "400", description = "Invalid or expired OTP")
    public ResponseEntity<AppApiResponse<AuthenticationResponse>> verifyOtp(
            @Valid @RequestBody VerifyOtpRequest request,
            @RequestHeader(value = "Device-Id", required = false, defaultValue = "") String deviceId,
            @RequestHeader(value = "X-Forwarded-For", required = false, defaultValue = "") String ip,
            @RequestHeader(value = "User-Agent", required = false, defaultValue = "") String userAgent,
            HttpServletResponse response) {

        AuthenticationResponse authResponse = authenticationService.verifyOtpAndLogin(
                request.emailOrPhone(), request.code(), deviceId, ip, userAgent
        );

        return createAuthResponseEntity(authResponse, response, "OTP verification successful");
    }


    /**
     * Hàm tiện ích private để tạo ResponseEntity chuẩn cho các phương thức login/refresh.
     * Nó sẽ set cookie refreshToken và header Authorization.
     */
    private ResponseEntity<AppApiResponse<AuthenticationResponse>> createAuthResponseEntity(
            AuthenticationResponse authResponse,
            HttpServletResponse response,
            String message) {

        String refreshToken = authResponse.getRefreshToken();

        Cookie cookie = new Cookie("refreshToken", refreshToken);
        cookie.setHttpOnly(true);
        cookie.setSecure(true); // if using HTTPS
        cookie.setPath("/");
        cookie.setMaxAge(30 * 24 * 60 * 60); // 30 days
        response.addCookie(cookie);

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + authResponse.getToken());

        return ResponseEntity.ok()
                .headers(headers)
                .body(AppApiResponse.<AuthenticationResponse>builder()
                        .code(200)
                        .message(message)
                        .result(authResponse)
                        .build());
    }

}
