package com.connectJPA.LinguaVietnameseApp.controller;

import com.connectJPA.LinguaVietnameseApp.dto.request.UserRequest;
import com.connectJPA.LinguaVietnameseApp.dto.response.*;
import com.connectJPA.LinguaVietnameseApp.dto.request.AuthenticationRequest;
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
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Tag(name = "Authentication", description = "Quản lý xác thực người dùng")
public class AuthenticationController {
    AuthenticationService authenticationService;
    UserService userService;

    @PostMapping("/firebase-login")
    @Operation(summary = "Đăng nhập bằng Firebase", description = "Xác thực người dùng qua Firebase ID token")
    @ApiResponse(responseCode = "200", description = "Đăng nhập Firebase thành công")
    @ApiResponse(responseCode = "401", description = "Token Firebase không hợp lệ")
    public ResponseEntity<AppApiResponse<AuthenticationResponse>> firebaseLogin(
            @RequestHeader("Authorization") String authHeader) {

        String firebaseIdToken = authHeader.replace("Bearer ", "").trim();
        AuthenticationResponse authResponse = authenticationService.loginWithFirebase(firebaseIdToken);

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + authResponse.getToken());

        return ResponseEntity.ok()
                .headers(headers)
                .body(AppApiResponse.<AuthenticationResponse>builder()
                        .code(200)
                        .message("Đăng nhập Firebase thành công")
                        .result(authResponse)
                        .build());
    }




    // --- Controller method for logoutAll ---
    @PostMapping("/logout-all")
    public AppApiResponse<Void> logoutAll(@RequestHeader("userId") UUID userId) {
        authenticationService.logoutAll(userId);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message("Đăng xuất tất cả thiết bị thành công")
                .build();
    }


    @PostMapping("/login")
    @Operation(summary = "Đăng nhập", description = "Xác thực người dùng và trả về token")
    @ApiResponse(responseCode = "200", description = "Đăng nhập thành công")
    @ApiResponse(responseCode = "401", description = "Thông tin xác thực không hợp lệ")
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
        cookie.setSecure(true); // nếu dùng HTTPS
        cookie.setPath("/");
        cookie.setMaxAge(30 * 24 * 60 * 60); // 30 ngày
        response.addCookie(cookie);

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + result.getToken());

        return ResponseEntity.ok()
                .headers(headers)
                .body(AppApiResponse.<AuthenticationResponse>builder()
                        .code(200)
                        .message("Đăng nhập thành công")
                        .result(result)
                        .build());
    }


    @PostMapping
    @Operation(summary = "Đăng ký người dùng", description = "Tạo mới một người dùng")
    @ApiResponse(responseCode = "200", description = "Người dùng được tạo thành công")
    @ApiResponse(responseCode = "400", description = "Dữ liệu đầu vào không hợp lệ")
    public AppApiResponse<UserResponse> registerUser(@Valid @RequestBody UserRequest request) {
        UserResponse userResponse = userService.createUser(request);

        return AppApiResponse.<UserResponse>builder()
                .code(200)
                .message("Người dùng được tạo thành công")
                .result(userResponse)
                .build();
    }


    @PostMapping("/refresh-token")
    @Operation(summary = "Làm mới token", description = "Làm mới access token từ refresh token, kiểm tra thiết bị để xử lý đúng luồng")
    @ApiResponse(responseCode = "200", description = "Token được làm mới thành công")
    @ApiResponse(responseCode = "400", description = "Refresh token không hợp lệ")
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
                        .message("Token được làm mới thành công")
                        .result(result)
                        .build());
    }


    @PostMapping("/logout")
    @Operation(summary = "Đăng xuất", description = "Vô hiệu hóa token hiện tại")
    @ApiResponse(responseCode = "200", description = "Đăng xuất thành công")
    @ApiResponse(responseCode = "400", description = "Token không hợp lệ")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or T(java.util.UUID).fromString(authentication.name).equals(#id)")
    public AppApiResponse<Void> logout(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        authenticationService.logout(token);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message("Đăng xuất thành công")
                .build();
    }

    @PostMapping("/introspect")
    @Operation(summary = "Kiểm tra token", description = "Kiểm tra tính hợp lệ của token")
    @ApiResponse(responseCode = "200", description = "Token được kiểm tra thành công")
    @ApiResponse(responseCode = "400", description = "Token không hợp lệ")
    public AppApiResponse<IntrospectResponse> introspect(@RequestHeader("Authorization") String authorizationHeader) throws ParseException, JOSEException {
        String token = authorizationHeader.replace("Bearer ", "");
        var result = authenticationService.introspect(token);
        return AppApiResponse.<IntrospectResponse>builder()
                .code(200)
                .message("Token được kiểm tra thành công")
                .result(result)
                .build();
    }

    @PostMapping("/register")
    @Operation(summary = "Đăng ký tài khoản bằng email", description = "Tạo tài khoản mới bằng email và mật khẩu")
    @ApiResponse(responseCode = "200", description = "Đăng ký thành công, vui lòng xác nhận email")
    @ApiResponse(responseCode = "400", description = "Dữ liệu đầu vào không hợp lệ hoặc email đã tồn tại")
    public AppApiResponse<UserResponse> registerWithEmail(@Valid @RequestBody UserRequest request) {
        UserResponse createdUser = userService.createUser(request);
        authenticationService.sendVerifyEmail(createdUser.getEmail(), createdUser.getUserId());
        return AppApiResponse.<UserResponse>builder()
                .code(200)
                .message("Đăng ký thành công, vui lòng kiểm tra email để xác minh tài khoản")
                .result(createdUser)
                .build();
    }


    @PostMapping("/forgot-password")
    @Operation(summary = "Quên mật khẩu", description = "Gửi email đặt lại mật khẩu")
    @ApiResponse(responseCode = "200", description = "Đã gửi email đặt lại mật khẩu")
    @ApiResponse(responseCode = "400", description = "Email không tồn tại")
    public AppApiResponse<Void> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        authenticationService.sendPasswordResetCode(email);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message("Mã đặt lại mật khẩu đã được gửi đến email")
                .build();
    }

    @PostMapping("/verify-code")
    @Operation(summary = "Xác thực mã đặt lại mật khẩu", description = "Xác minh mã được gửi qua email để lấy reset token")
    @ApiResponse(responseCode = "200", description = "Mã hợp lệ")
    @ApiResponse(responseCode = "400", description = "Mã không hợp lệ hoặc hết hạn")
    public AppApiResponse<Map<String, String>> verifyResetCode(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String code = body.get("code");
        String resetToken = authenticationService.verifyResetCode(email, code);
        return AppApiResponse.<Map<String, String>>builder()
                .code(200)
                .message("Mã hợp lệ")
                .result(Map.of("resetToken", resetToken))
                .build();
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Đặt lại mật khẩu", description = "Đổi mật khẩu mới bằng reset token")
    @ApiResponse(responseCode = "200", description = "Đặt lại mật khẩu thành công")
    @ApiResponse(responseCode = "400", description = "Token không hợp lệ hoặc mật khẩu không hợp lệ")
    public AppApiResponse<Void> resetPassword(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        String newPassword = body.get("password");
        authenticationService.resetPassword(token, newPassword);
        return AppApiResponse.<Void>builder()
                .code(200)
                .message("Đặt lại mật khẩu thành công")
                .build();
    }

}